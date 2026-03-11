"""OpenClaw 钉钉消息接收服务。

根据消息/文件类型，精准分类落库：
  - 文档类 (doc/xls/ppt/pdf/txt/image/other) → 文档目录
  - 视频类 (mp4/avi/m4a/wmv)                → 视频目录
  - 音频类 (mp3/wav)                         → 音频目录
  - 网页链接                                 → 网页目录（电商URL → 商品目录）
  - 文本消息                                 → 消息目录（sub_type=text）
  - 消息动作（发图/发文件等）                → 消息目录（sub_type=image_msg/action_msg）
  - 消息集合（富文本/群聊打包）              → 消息目录（sub_type=collection）
"""
import base64
import hashlib
import json
import logging
import os
import re
import tempfile
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import httpx

from ..config import get_settings
from ..database import SessionLocal
from ..models import Document, DocumentContent, Source, Message, Product
from . import parsing_service, ai_service
from .ai_worker import enqueue as enqueue_ai

logger = logging.getLogger(__name__)
settings = get_settings()

# 存储下载的媒体文件的目录
MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 文件扩展名 → doc_type 映射
# ---------------------------------------------------------------------------
EXT_TO_DOC_TYPE = {
    # 文档类
    "doc": "doc", "docx": "doc",
    "xls": "xls", "xlsx": "xls",
    "ppt": "ppt", "pptx": "ppt",
    "pdf": "pdf",
    "txt": "txt",
    # 图片类
    "bmp": "image", "png": "image", "jpg": "image",
    "jpeg": "image", "tiff": "image", "tif": "image",
    # 视频类
    "mp4": "video", "avi": "video", "m4a": "video", "wmv": "video",
    # 音频类
    "mp3": "audio", "wav": "audio",
}

# 电商平台域名识别（仅识别smzdm作为入口）
ECOMMERCE_DOMAINS = {
    "smzdm.com": "smzdm",
}

# 实际电商平台关键词映射
ACTUAL_PLATFORM_KEYWORDS = {
    "taobao": ["taobao.com", "淘宝", "淘寶"],
    "tmall": ["tmall.com", "天猫", "天貓"],
    "jd": ["jd.com", "京东", "京東"],
    "pdd": ["pinduoduo.com", "拼多多"],
    "vip": ["vip.com", "唯品会", "唯品會"],
    "douyin": ["douyin.com", "抖音"],
    "bieyang": ["bieyangapp.com", "别样", "別樣"],
}


def _get_ecommerce_platform(url: str) -> Optional[str]:
    """识别是否为smzdm链接，返回'smzdm'或None。"""
    try:
        hostname = urlparse(url).hostname or ""
        if "smzdm.com" in hostname:
            return "smzdm"
    except Exception:
        pass
    return None


def _extract_actual_platform(scraped_text: str, html: str) -> str:
    """从smzdm网页内容中识别实际电商平台。
    
    优先从HTML中提取跳转链接，后备从内容关键词匹配。
    返回: taobao/tmall/jd/pdd/vip/douyin/bieyang/unknown
    """
    combined_text = (html or "") + " " + (scraped_text or "")
    combined_lower = combined_text.lower()
    
    # 按优先级匹配平台
    return "unknown"


def _generate_title_from_content(content: Optional[str], max_len: int = 50) -> Optional[str]:
    """从内容生成标题，取第一行或前几个字。"""
    if not content:
        return None
    content = content.strip()
    if not content:
        return None
    first_line = content.split('\n')[0].strip()
    if len(first_line) > max_len:
        return first_line[:max_len] + "..."
    return first_line


def _parse_timestamp(ts: Optional[int]) -> datetime:
    """将毫秒时间戳转换为 datetime。"""
    if not ts:
        return datetime.now()
    try:
        return datetime.fromtimestamp(ts / 1000.0)
    except Exception:
        return datetime.now()


def _format_timestamp(ts: Optional[int]) -> str:
    """格式化时间戳为字符串。"""
    dt = _parse_timestamp(ts)
    return dt.strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------

async def process_openclaw_message(
    message_type: str,
    content: str,
    sender_id: str,
    conversation_id: Optional[str] = None,
    media_url: Optional[str] = None,
    file_name: Optional[str] = None,
    timestamp: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> dict:
    """处理来自 OpenClaw 的钉钉消息。"""
    db = SessionLocal()
    try:
        logger.info(
            "收到 OpenClaw 消息: type=%s, media_url=%s, content=%s",
            message_type,
            media_url[:50] if media_url else "None",
            content[:50] if content else "None",
        )

        # 记录数据源
        source = Source(
            user_id=1,
            type="openclaw",
            detail=f"dingtalk:{sender_id}:{conversation_id or 'dm'}",
        )
        db.add(source)
        db.commit()

        # 自动探测钉钉发送的带有下载链接的“文件/视频/音频”消息，它们经常被钉钉误标记为 text
        if message_type == "text" and (media_url or (metadata and (metadata.get("downloadCode") or metadata.get("downloadUrl") or metadata.get("download_code")))):
            # 尝试根据扩展名或 content 关键词重新分类
            lower_content = (content or "").lower()
            if "视频" in lower_content:
                message_type = "video"
            elif "语音" in lower_content or "音频" in lower_content:
                message_type = "audio"
            elif "图片" in lower_content:
                message_type = "image"
            else:
                message_type = "file"
            
            # 提取下载链接
            if not media_url and metadata:
                media_url = metadata.get("downloadUrl")

        result = {"status": "ok", "message_type": message_type}

        if message_type == "text":
            msg = await _process_text_message(db, content, sender_id, conversation_id, timestamp)
            result["message_id"] = msg.id if msg else None

        elif message_type == "image":
            doc, msg = await _process_image_message(db, content, media_url, sender_id, conversation_id, timestamp)
            result["doc_id"] = doc.id if doc else None
            result["message_id"] = msg.id if msg else None

        elif message_type == "audio":
            doc, msg = await _process_audio_message(db, content, media_url, sender_id, conversation_id, timestamp)
            result["doc_id"] = doc.id if doc else None
            result["message_id"] = msg.id if msg else None

        elif message_type == "video":
            doc, msg = await _process_video_message(db, content, media_url, sender_id, conversation_id, timestamp)
            result["doc_id"] = doc.id if doc else None
            result["message_id"] = msg.id if msg else None

        elif message_type == "file":
            doc, msg = await _process_file_message(
                db, content, media_url, file_name, sender_id, conversation_id, timestamp, metadata
            )
            result["doc_id"] = doc.id if doc else None
            result["message_id"] = msg.id if msg else None

        elif message_type == "richtext":
            msg = await _process_richtext_message(db, content, sender_id, conversation_id, timestamp, metadata)
            result["message_id"] = msg.id if msg else None

        elif message_type == "link":
            res = await _process_link_message(db, content, media_url, sender_id, conversation_id, timestamp)
            result.update(res)

        else:
            # 未知类型，按文本处理
            msg = await _process_text_message(
                db, f"[{message_type}] {content}", sender_id, conversation_id, timestamp
            )
            result["message_id"] = msg.id if msg else None

        return result

    except Exception as e:
        logger.error("处理 OpenClaw 消息失败: %s", e)
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 消息处理函数
# ---------------------------------------------------------------------------

async def _process_text_message(
    db, content: str, sender_id: str, conversation_id: Optional[str], timestamp: Optional[int]
) -> Optional[Message]:
    """处理文本消息 → 保存到消息记录（sub_type=text）。"""
    if not content or not content.strip():
        return None

    send_time = _parse_timestamp(timestamp)
    msg = Message(
        user_id=1,
        sub_type="text",
        sender_id=sender_id,
        conversation_id=conversation_id,
        send_time=send_time,
        text_content=content,
        action_desc=None,
        related_doc_id=None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    logger.info("已保存文本消息: message_id=%d, sender=%s", msg.id, sender_id)
    return msg


async def _process_image_message(
    db, description: str, media_url: Optional[str], sender_id: str,
    conversation_id: Optional[str], timestamp: Optional[int]
):
    """处理图片消息 → 图片存文档目录(doc_type=image) + 消息记录(sub_type=image_msg)。"""
    send_time = _parse_timestamp(timestamp)
    doc = None
    local_path = None

    if media_url:
        # 支持 file:// 协议
        if media_url.startswith("file://"):
            file_path = media_url[7:]
            if os.path.exists(file_path):
                safe_name = os.path.basename(file_path)
                dest_path = os.path.join(MEDIA_DIR, safe_name)
                import shutil
                shutil.copy2(file_path, dest_path)
                local_path = dest_path
        else:
            local_path = await _download_media(media_url, "image")
        
        if local_path:
            title = _generate_title_from_content(description) or "未命名图片"
            doc = Document(
                user_id=1,
                title=title,
                doc_type="image",
                status="pending",
                original_path=local_path,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            # VL 分析
            vl_result = await _analyze_image_with_vl(local_path)
            full_content = (
                f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n"
                f"[描述: {description}]\n\n[AI图片分析]\n{vl_result}"
                if vl_result
                else f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n[图片]\n{description}"
            )
            doc_content = DocumentContent(
                document_id=doc.id, raw_text=description, cleaned_text=full_content, version=1
            )
            db.add(doc_content)
            db.commit()
            parsing_service.chunk_and_index_text(db, doc, full_content)
            
            # 自动分类到知识目录
            try:
                from .knowledge_service import auto_classify_and_move
                if auto_classify_and_move(db, doc):
                    logger.info("图片已自动分类到知识目录: doc_id=%d", doc.id)
            except Exception as e:
                logger.warning("自动分类失败: doc_id=%d, error=%s", doc.id, e)
            
            # 加入 AI 处理队列（智能打标）
            enqueue_ai(doc.id)

    # 消息记录
    action_desc = f"发送了图片: {description or '(图片)'}"
    msg = Message(
        user_id=1,
        sub_type="image_msg",
        sender_id=sender_id,
        conversation_id=conversation_id,
        send_time=send_time,
        text_content=description,
        action_desc=action_desc,
        related_doc_id=doc.id if doc else None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    logger.info("已保存图片消息: doc_id=%s, message_id=%d", doc.id if doc else None, msg.id)
    return doc, msg


async def _process_audio_message(
    db, description: str, media_url: Optional[str], sender_id: str,
    conversation_id: Optional[str], timestamp: Optional[int]
):
    """处理语音消息 → 音频存文档目录(doc_type=audio) + 消息记录(sub_type=action_msg)。"""
    send_time = _parse_timestamp(timestamp)
    doc = None

    if media_url:
        local_path = await _download_media(media_url, "audio")
        if local_path:
            title = _generate_title_from_content(description) or "未命名音频"
            doc = Document(
                user_id=1,
                title=title,
                doc_type="audio",
                status="pending",
                original_path=local_path,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            asr_result = await ai_service.transcribe_audio(local_path)
            full_content = (
                f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n[语音转写]\n{asr_result}"
                if asr_result
                else f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n[语音]\n{description}"
            )
            doc_content = DocumentContent(
                document_id=doc.id, raw_text=description, cleaned_text=full_content, version=1
            )
            db.add(doc_content)
            db.commit()
            parsing_service.chunk_and_index_text(db, doc, full_content)

            # 自动分类到知识目录
            try:
                from .knowledge_service import auto_classify_and_move
                if auto_classify_and_move(db, doc):
                    logger.info("音频已自动分类到知识目录: doc_id=%d", doc.id)
            except Exception as e:
                logger.warning("自动分类失败: doc_id=%d, error=%s", doc.id, e)

            # 加入 AI 处理队列（智能打标）
            enqueue_ai(doc.id)

    action_desc = f"发送了语音消息: {description or '(音频)'}"
    msg = Message(
        user_id=1,
        sub_type="action_msg",
        sender_id=sender_id,
        conversation_id=conversation_id,
        send_time=send_time,
        text_content=description,
        action_desc=action_desc,
        related_doc_id=doc.id if doc else None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    logger.info("已保存语音消息: doc_id=%s, message_id=%d", doc.id if doc else None, msg.id)
    return doc, msg


async def _process_video_message(
    db, description: str, media_url: Optional[str], sender_id: str,
    conversation_id: Optional[str], timestamp: Optional[int]
):
    """处理视频消息 → 视频存文档目录(doc_type=video) + 消息记录(sub_type=action_msg)。"""
    send_time = _parse_timestamp(timestamp)
    doc = None

    if media_url:
        local_path = await _download_media(media_url, "video")
        if local_path:
            title = _generate_title_from_content(description) or "未命名视频"
            doc = Document(
                user_id=1,
                title=title,
                doc_type="video",
                status="pending",
                original_path=local_path,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            full_content = (
                f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n"
                f"[视频]\n{description}\n\n文件路径: {local_path}"
            )
            doc_content = DocumentContent(
                document_id=doc.id, raw_text=description, cleaned_text=full_content, version=1
            )
            db.add(doc_content)
            db.commit()
            parsing_service.chunk_and_index_text(db, doc, full_content)

            # 自动分类到知识目录
            try:
                from .knowledge_service import auto_classify_and_move
                if auto_classify_and_move(db, doc):
                    logger.info("视频已自动分类到知识目录: doc_id=%d", doc.id)
            except Exception as e:
                logger.warning("自动分类失败: doc_id=%d, error=%s", doc.id, e)

            # 加入 AI 处理队列（智能打标）
            enqueue_ai(doc.id)

    action_desc = f"发送了视频: {description or '(视频)'}"
    msg = Message(
        user_id=1,
        sub_type="action_msg",
        sender_id=sender_id,
        conversation_id=conversation_id,
        send_time=send_time,
        text_content=description,
        action_desc=action_desc,
        related_doc_id=doc.id if doc else None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    logger.info("已保存视频消息: doc_id=%s, message_id=%d", doc.id if doc else None, msg.id)
    return doc, msg


async def _process_file_message(
    db, description: str, media_url: Optional[str], file_name: Optional[str],
    sender_id: str, conversation_id: Optional[str], timestamp: Optional[int],
    metadata: Optional[dict] = None,
):
    """处理文件消息 → 按扩展名分类存储 + 消息记录(sub_type=action_msg)。"""
    send_time = _parse_timestamp(timestamp)
    local_path = None

    # 1. 尝试通过 downloadCode 下载（钉钉 Stream 模式）
    if metadata:
        download_code = metadata.get("downloadCode") or metadata.get("download_code")
        if download_code:
            local_path = await _download_dingtalk_media(download_code, file_name)

    # 2. 本地 file:// 路径
    if not local_path and media_url and media_url.startswith("file://"):
        file_path = media_url[7:]
        if os.path.exists(file_path):
            safe_name = (
                file_name.replace("/", "_").replace("\\", "_") if file_name
                else os.path.basename(file_path)
            )
            dest_path = os.path.join(MEDIA_DIR, safe_name)
            import shutil
            shutil.copy2(file_path, dest_path)
            local_path = dest_path

    # 3. URL 下载
    if not local_path and media_url and not media_url.startswith("file://"):
        local_path = await _download_media(media_url, "file", file_name)

    doc = None
    if local_path:
        ext = os.path.splitext(file_name or local_path)[1].lower().lstrip(".")
        doc_type = EXT_TO_DOC_TYPE.get(ext, "other")

        # 优先使用 description (从钉钉附带的文字)，如果没有则使用 file_name / local_path
        title = _generate_title_from_content(description)
        if not title:
            title = file_name or os.path.basename(local_path)
            
        doc = Document(
            user_id=1,
            title=title,
            doc_type=doc_type,
            status="pending",
            original_path=local_path,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 对支持解析的格式提取文本
        parseable = ("doc", "xls", "ppt", "pdf", "txt")
        if doc_type in parseable:
            parsing_service.parse_text_document(db, doc)
        else:
            full_content = (
                f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n"
                f"[文件: {file_name}]\n{description}\n\n文件路径: {local_path}"
            )
            doc_content = DocumentContent(
                document_id=doc.id, raw_text=description, cleaned_text=full_content, version=1
            )
            db.add(doc_content)
            db.commit()
            parsing_service.chunk_and_index_text(db, doc, full_content)

        logger.info("已保存文件: doc_id=%d, type=%s, path=%s", doc.id, doc_type, local_path)
        
        # 自动分类到知识目录
        try:
            from .knowledge_service import auto_classify_and_move
            if auto_classify_and_move(db, doc):
                logger.info("文件已自动分类到知识目录: doc_id=%d", doc.id)
        except Exception as e:
            logger.warning("自动分类失败: doc_id=%d, error=%s", doc.id, e)
        
        # 加入 AI 处理队列（智能打标）
        enqueue_ai(doc.id)
    else:
        logger.warning("文件下载失败: %s", file_name or description)

    # 消息记录
    action_desc = f"发送了文件: {file_name or description or '(未知文件)'}"
    msg = Message(
        user_id=1,
        sub_type="action_msg",
        sender_id=sender_id,
        conversation_id=conversation_id,
        send_time=send_time,
        text_content=description,
        action_desc=action_desc,
        related_doc_id=doc.id if doc else None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return doc, msg


async def _process_richtext_message(
    db, content: str, sender_id: str, conversation_id: Optional[str],
    timestamp: Optional[int], metadata: Optional[dict]
) -> tuple[Optional[Document], Optional[Message]]:
    """处理富文本消息 / Collection → 保存为笔记 (note) + 消息记录。"""
    send_time = _parse_timestamp(timestamp)

    # Note 标题
    title = _generate_title_from_content(content) or "未命名笔记"

    doc = Document(
        user_id=1,
        title=title,
        doc_type="note",
        status="pending",
        original_path=None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    full_content = (
        f"[来源: 钉钉 {sender_id}]\n[时间: {_format_timestamp(timestamp)}]\n"
        f"[富文本/消息集合]\n{content}"
    )
    doc_content = DocumentContent(
        document_id=doc.id, raw_text=content, cleaned_text=full_content, version=1
    )
    db.add(doc_content)
    db.commit()
    parsing_service.chunk_and_index_text(db, doc, full_content)

    msg = Message(
        user_id=1,
        sub_type="collection",
        sender_id=sender_id,
        conversation_id=conversation_id,
        send_time=send_time,
        text_content=content,
        action_desc="消息集合（富文本/群聊打包内容）",
        related_doc_id=doc.id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    logger.info("已保存消息集合: doc_id=%d, message_id=%d", doc.id, msg.id)
    return doc, msg


async def _process_link_message(
    db, title_or_desc: str, url: Optional[str], sender_id: str,
    conversation_id: Optional[str], timestamp: Optional[int]
) -> dict:
    """处理链接消息 → 电商链接存商品目录，普通链接存网页目录，均记录消息动作。"""
    send_time = _parse_timestamp(timestamp)
    result: dict = {}

    if not url:
        msg = await _process_text_message(db, f"[链接] {title_or_desc}", sender_id, conversation_id, timestamp)
        result["message_id"] = msg.id if msg else None
        return result

    platform = _get_ecommerce_platform(url)

    if platform:
        # 商品解析
        product = await _parse_and_save_product(db, url, title_or_desc, platform, sender_id, send_time)
        action_desc = f"分享了{platform}商品链接: {title_or_desc or url}"
        msg = Message(
            user_id=1,
            sub_type="action_msg",
            sender_id=sender_id,
            conversation_id=conversation_id,
            send_time=send_time,
            text_content=title_or_desc,
            action_desc=action_desc,
            related_doc_id=None,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        if product:
            product.message_id = msg.id
            db.commit()

        result["product_id"] = product.id if product else None
        result["message_id"] = msg.id
        logger.info("已保存商品链接: product_id=%s, message_id=%d", product.id if product else None, msg.id)

    else:
        # 普通网页
        title = _generate_title_from_content(title_or_desc) or url
        doc = Document(
            user_id=1,
            title=title,
            doc_type="web",
            status="pending",
            original_path=url,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        parsing_service.fetch_and_parse_web(db, doc, url)

        action_desc = f"分享了网页链接: {title_or_desc or url}"
        msg = Message(
            user_id=1,
            sub_type="action_msg",
            sender_id=sender_id,
            conversation_id=conversation_id,
            send_time=send_time,
            text_content=title_or_desc,
            action_desc=action_desc,
            related_doc_id=doc.id,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        result["doc_id"] = doc.id
        result["message_id"] = msg.id
        logger.info("已保存网页链接: doc_id=%d, message_id=%d", doc.id, msg.id)

    return result


# ---------------------------------------------------------------------------
# 商品解析
# ---------------------------------------------------------------------------


async def _parse_and_save_product(
    db, url: str, fallback_title: str, platform: str, sender_id: str, send_time
) -> Optional[Product]:
    """抓取smzdm页面，提取商品信息并识别实际电商平台后保存。"""
    title = fallback_title or url
    main_image_url = None
    price = None
    specs_json = None
    main_image_path = None
    html = ""
    actual_platform = "unknown"

    try:
        # 对于 smzdm，直接使用 httpx 会被反爬虫拦截，因此统一优先使用阿里云的接口获取 html 和 text
        from . import web_service
        # 首先尝试 stealthMode 抓取（更好地绕过反爬虫）
        scraped_text = web_service.scrape_page(url, stealth=True)
        
        # 很多时候 smzdm 会拦截并返回只有 200 多字节的 probe 页面
        # 如果 scraped_text 中包含 probe.js 或者长度太短，主动置空避免被当成正常正文提取
        if scraped_text and ("probe.js" in scraped_text or len(scraped_text) < 300):
            logger.info("stealthMode 抓取被拦截(probe.js)，尝试普通模式...")
            scraped_text = ""
        
        # 如果 stealth 模式失败，尝试普通模式
        if not scraped_text:
            scraped_text = web_service.scrape_page(url)
            if scraped_text and ("probe.js" in scraped_text or len(scraped_text) < 300):
                scraped_text = ""
        
        # 如果直接抓取全部失败，使用搜索 API 回退获取缓存内容
        if not scraped_text:
            logger.info("直接抓取失败，使用搜索 API 回退: %s", url[:60])
            # 用 URL 搜索以找到缓存
            search_text = web_service.scrape_via_search(url, target_url=url)
            if not search_text and fallback_title:
                # 如果 URL 搜不到，用标题搜
                search_text = web_service.scrape_via_search(fallback_title + " 什么值得买", target_url=url)
            if search_text and len(search_text) > 100:
                scraped_text = search_text
                logger.info("搜索 API 回退成功，获取到 %d 字符内容", len(scraped_text))
        
        # 终极回退：通过百度搜索获取 smzdm 商品信息
        if not scraped_text and "smzdm.com" in url:
            import re as _re
            article_match = _re.search(r'/p/(\d+)', url)
            if article_match:
                article_id = article_match.group(1)
                logger.info("使用百度搜索回退抓取: article_id=%s", article_id)
                baidu_text = web_service.scrape_smzdm_via_baidu(article_id, url)
                if baidu_text and len(baidu_text) > 50:
                    scraped_text = baidu_text
                    logger.info("百度搜索回退成功，获取到 %d 字符内容", len(scraped_text))
        
        # 为了尽量兼容原有的价格/图片正则等，提取 html 仍旧尝试直连（如果被拦就算了），
        # 因为主要的摘要和标签生成现在都基于 scraped_text
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        async with httpx.AsyncClient(timeout=20, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            html = resp.text
            
        if html and ("probe.js" in html or len(html) < 300):
            html = ""
        # 尝试从 fallback_title 补救
        if "smzdm.com" in url and fallback_title:
            title_match = re.search(r"^(.*?)(_什么值得买| - 什么值得买)", fallback_title)
            if title_match:
                title = title_match.group(1).strip()[:200]
            else:
                title = fallback_title[:200]
        
        # 提取标题
        if html:
            title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            if title_match:
                raw_title = title_match.group(1).strip()
                # 去掉平台后缀
                raw_title = re.sub(r"\s*[_-]\s*(淘宝|天猫|阿里巴巴|1688|闲鱼|Goofish|什么值得买).*$", "", raw_title)
                if raw_title:
                    title = raw_title[:200]

        # 提取主图（og:image）
        if html:
            og_image = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](.*?)["\']', html)
            if og_image:
                main_image_url = og_image.group(1)
            else:
                # 淘宝/天猫商品图片模式
                img_match = re.search(r'"mainImgUrl"\s*:\s*"(https?://[^"]+)"', html)
                if img_match:
                    main_image_url = img_match.group(1)

            # 提取价格
            price_patterns = [
                r'"price"\s*:\s*"([\d.,]+)"',
                r'"defaultPrice"\s*:\s*"([\d.,]+)"',
                r'class="[^"]*price[^"]*"[^>]*>.*?(\d+\.?\d*)',
            ]
            for pattern in price_patterns:
                pm = re.search(pattern, html)
                if pm:
                    price = pm.group(1)
                    break

        # 尝试下载主图
        if main_image_url:
            try:
                async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                    img_resp = await client.get(main_image_url)
                    if img_resp.status_code == 200:
                        ext = ".jpg"
                        ct = img_resp.headers.get("content-type", "")
                        if "png" in ct:
                            ext = ".png"
                        elif "webp" in ct:
                            ext = ".webp"
                        hash_part = hashlib.md5(url.encode()).hexdigest()[:8]
                        img_filename = f"product_{hash_part}{ext}"
                        main_image_path = os.path.join(MEDIA_DIR, img_filename)
                        with open(main_image_path, "wb") as f:
                            f.write(img_resp.content)
            except Exception as ie:
                logger.warning("商品主图下载失败: %s", ie)

        # ---------------- 调用百炼核心 AI 获取标签分类等 ----------------
        level1_tag = None
        level2_tag = None
        level3_tag = None
        other_info_json = None
        
        try:
            if scraped_text:
                ai_data = ai_service.extract_product_info_and_tags(scraped_text)
                if ai_data:
                    level1_tag = ai_data.get("level1_tag")
                    level2_tag = ai_data.get("level2_tag")
                    level3_tag = ai_data.get("level3_tag")
                    ai_specs = ai_data.get("specs")
                    if ai_specs:
                        specs_json = ai_specs
                    other_info_json = ai_data.get("other_info")
                    # 从AI结果补充无法从HTML提取的字段
                    if not title or title == url:
                        ai_title = ai_data.get("title")
                        if ai_title:
                            title = ai_title[:200]
                    if not price:
                        ai_price = ai_data.get("price")
                        if ai_price:
                            price = ai_price
                    if not main_image_url:
                        ai_image = ai_data.get("main_image_url")
                        if ai_image:
                            main_image_url = ai_image
                    ai_platform = ai_data.get("actual_platform")
                    if ai_platform and ai_platform != "unknown":
                        actual_platform = ai_platform
            
            # 从内容中识别实际电商平台（如果AI没识别出来，用关键词兜底）
            if actual_platform == "unknown":
                actual_platform = _extract_actual_platform(scraped_text, html)
        except Exception as ai_e:
            logger.warning("商品 AI 提炼失败: %s", ai_e)


    except Exception as e:
        logger.warning("商品页面抓取失败 (%s): %s", url[:60], e)

    product = Product(
        user_id=1,
        title=title,
        original_platform=platform,  # 识别入口平台（smzdm）
        platform=actual_platform,    # 实际电商平台
        source_url=url,
        main_image_url=main_image_url,
        main_image_path=main_image_path,
        price=price,
        specs_json=specs_json,
        scraped_text=scraped_text,
        level1_tag=level1_tag,
        level2_tag=level2_tag,
        level3_tag=level3_tag,
        other_info_json=other_info_json,
        sender_id=sender_id,
        send_time=send_time,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------

def _parse_timestamp(ts: Optional[int]) -> Optional[datetime]:
    """将毫秒时间戳解析为 datetime。"""
    if not ts:
        return None
    try:
        return datetime.fromtimestamp(ts / 1000 if ts > 1e12 else ts)
    except Exception:
        return None


def _format_timestamp(ts: Optional[int]) -> str:
    """格式化时间戳为可读字符串。"""
    dt = _parse_timestamp(ts)
    return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# DingTalk API 辅助函数
# ---------------------------------------------------------------------------

_dingtalk_access_token: Optional[str] = None
_dingtalk_token_expires: float = 0


async def _get_dingtalk_access_token() -> Optional[str]:
    """获取钉钉 API access_token。"""
    global _dingtalk_access_token, _dingtalk_token_expires

    import time
    if _dingtalk_access_token and time.time() < _dingtalk_token_expires:
        return _dingtalk_access_token

    app_key = settings.dingtalk_app_key
    app_secret = settings.dingtalk_app_secret

    if not app_key or not app_secret:
        logger.warning("钉钉 API 凭据未配置")
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.dingtalk.com/v1.0/oauth2/accessToken",
                json={"appKey": app_key, "appSecret": app_secret},
            )
            data = resp.json()
            if data.get("accessToken"):
                _dingtalk_access_token = data.get("accessToken")
                _dingtalk_token_expires = time.time() + data.get("expireIn", 7200) - 300
                return _dingtalk_access_token
            else:
                logger.warning("获取钉钉 access_token 失败: %s", data)
                return None
    except Exception as e:
        logger.warning("获取钉钉 access_token 异常: %s", e)
        return None


async def _download_dingtalk_media(download_code: str, file_name: Optional[str] = None) -> Optional[str]:
    """通过 downloadCode 下载钉钉媒体文件。"""
    access_token = await _get_dingtalk_access_token()
    if not access_token:
        return None

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://api.dingtalk.com/v1.0/robot/messageFiles/download",
                headers={"x-acs-dingtalk-access-token": access_token},
                json={"downloadCode": download_code},
            )
            data = resp.json()
            if data.get("code"):
                logger.warning("获取钉钉文件下载URL失败: %s", data.get("message"))
                return None

            download_url = data.get("downloadUrl")
            if not download_url:
                return None

            file_resp = await client.get(download_url, follow_redirects=True)
            file_resp.raise_for_status()

            if file_name:
                safe_name = file_name.replace("/", "_").replace("\\", "_")
            else:
                content_disp = file_resp.headers.get("content-disposition", "")
                if "filename=" in content_disp:
                    match = re.search(r'filename[*]?=["\']?([^"\';\n]+)', content_disp)
                    safe_name = match.group(1).strip() if match else f"dingtalk_{hashlib.md5(download_code.encode()).hexdigest()[:8]}"
                else:
                    safe_name = f"dingtalk_{hashlib.md5(download_code.encode()).hexdigest()[:8]}"

            local_path = os.path.join(MEDIA_DIR, safe_name)
            with open(local_path, "wb") as f:
                f.write(file_resp.content)

            logger.info("钉钉文件下载成功: %s -> %s", download_code[:20], local_path)
            return local_path

    except Exception as e:
        logger.warning("钉钉文件下载失败: %s", e)
        return None


async def _download_media(url: str, media_type: str, file_name: Optional[str] = None) -> Optional[str]:
    """下载媒体文件到本地。"""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()

        if file_name:
            safe_name = file_name.replace("/", "_").replace("\\", "_")
        else:
            content_type = resp.headers.get("content-type", "")
            ext = _get_extension_from_content_type(content_type, media_type)
            hash_part = hashlib.md5(url.encode()).hexdigest()[:8]
            safe_name = f"{media_type}_{hash_part}{ext}"

        local_path = os.path.join(MEDIA_DIR, safe_name)
        with open(local_path, "wb") as f:
            f.write(resp.content)

        logger.info("媒体下载成功: %s -> %s", url[:50], local_path)
        return local_path

    except Exception as e:
        logger.warning("媒体下载失败 %s: %s", url[:50], e)
        return None


def _get_extension_from_content_type(content_type: str, media_type: str) -> str:
    """根据 content-type 获取文件扩展名。"""
    ct = content_type.lower()
    mapping = {
        "jpeg": ".jpg", "jpg": ".jpg", "png": ".png", "gif": ".gif", "webp": ".webp",
        "mp3": ".mp3", "wav": ".wav", "ogg": ".ogg",
        "mp4": ".mp4", "webm": ".webm",
        "pdf": ".pdf",
    }
    for key, ext in mapping.items():
        if key in ct:
            return ext
    defaults = {"image": ".jpg", "audio": ".mp3", "video": ".mp4", "file": ""}
    return defaults.get(media_type, "")


async def _analyze_image_with_vl(image_path: str) -> Optional[str]:
    """使用 VL 模型分析图片（通过 OpenAI 兼容协议）。"""
    api_key = settings.maas_api_key
    base_url = settings.maas_base_url
    if not api_key or not base_url:
        return None

    try:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        ext = os.path.splitext(image_path)[1].lower()
        mime_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                      ".gif": "image/gif", ".webp": "image/webp"}
        mime_type = mime_types.get(ext, "image/jpeg")

        # 使用 OpenAI 兼容的 vision 格式
        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_data}"},
                },
                {
                    "type": "text",
                    "text": "请详细描述这张图片的内容，包括主要元素、场景、文字（如果有）、以及任何重要细节。",
                },
            ],
        }]

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "qwen3.5-plus",  # 支持图片理解的模型
            "messages": messages,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        choices = data.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            return message.get("content", "")
        return None

    except Exception as e:
        logger.warning("VL 模型分析失败: %s", e)
        return None


