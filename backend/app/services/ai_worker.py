"""后台异步 AI 处理 Worker。

使用 asyncio.Queue 逐个处理文档的 AI 生成任务（摘要/思维导图/关键信息/打标），
不阻塞主请求线程。
"""
import asyncio
import json
import logging
from typing import Optional

from ..database import SessionLocal
from ..models import Document, DocumentContent, DocumentAIResult
from . import ai_service, tagging_service
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# 専用于长耗时 AI 任务的线程池，避免阻塞 FastAPI 默认线程池
_ai_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="ai_worker")

# 全局任务队列
_queue: asyncio.Queue = asyncio.Queue()
_worker_task: Optional[asyncio.Task] = None


def enqueue(doc_id: int):
    """将文档 ID 推入异步处理队列。"""
    try:
        _queue.put_nowait(doc_id)
        logger.info("文档 %d 已加入 AI 处理队列 (队列长度: %d)", doc_id, _queue.qsize())
    except Exception as e:
        logger.warning("入队失败 (doc_id=%d): %s", doc_id, e)


async def _process_doc(doc_id: int):
    """对单个文档执行 AI 生成（摘要/思维导图/关键信息/打标）。"""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            logger.warning("AI Worker: 文档 %d 不存在", doc_id)
            return

        content = (
            db.query(DocumentContent)
            .filter(DocumentContent.document_id == doc_id)
            .order_by(DocumentContent.version.desc())
            .first()
        )
        if not content:
            logger.warning("AI Worker: 文档 %d 无内容，跳过 AI 处理", doc_id)
            return

        text = content.cleaned_text or content.raw_text or ""
        if not text.strip():
            logger.warning("AI Worker: 文档 %d 内容为空，跳过", doc_id)
            return

        logger.info("AI Worker: 开始处理文档 %d (%s)", doc_id, doc.title[:30])

        # 1. 摘要
        try:
            summary = ai_service.generate_summary(text)
            if summary:
                _save_result(db, doc_id, "summary", summary)
                logger.info("AI Worker: 文档 %d 摘要生成完成", doc_id)
        except Exception as e:
            logger.warning("AI Worker: 文档 %d 摘要失败: %s", doc_id, e)

        # 2. 思维导图
        try:
            mindmap = ai_service.generate_mindmap(text)
            if mindmap:
                _save_result(db, doc_id, "mindmap", mindmap)
                logger.info("AI Worker: 文档 %d 思维导图生成完成", doc_id)
        except Exception as e:
            logger.warning("AI Worker: 文档 %d 思维导图失败: %s", doc_id, e)

        # 3. 关键信息
        try:
            key_info = ai_service.extract_key_info(text)
            if key_info:
                _save_result(db, doc_id, "key_info", json.dumps(key_info, ensure_ascii=False))
                logger.info("AI Worker: 文档 %d 关键信息提取完成", doc_id)
        except Exception as e:
            logger.warning("AI Worker: 文档 %d 关键信息失败: %s", doc_id, e)

        # 4. 智能打标
        try:
            tagging_service.tag_document(db, doc_id)
            logger.info("AI Worker: 文档 %d 智能打标完成", doc_id)
        except Exception as e:
            logger.warning("AI Worker: 文档 %d 打标失败: %s", doc_id, e)

        logger.info("AI Worker: 文档 %d 全部 AI 处理完成", doc_id)

    except Exception as e:
        logger.error("AI Worker: 处理文档 %d 异常: %s", doc_id, e)
    finally:
        db.close()


def _save_result(db, doc_id: int, result_type: str, content: str, model: str = None):
    """保存或更新 AI 结果。"""
    existing = (
        db.query(DocumentAIResult)
        .filter(DocumentAIResult.document_id == doc_id, DocumentAIResult.result_type == result_type)
        .first()
    )
    if existing:
        existing.content = content
        existing.model_used = model
    else:
        db.add(DocumentAIResult(
            document_id=doc_id,
            result_type=result_type,
            content=content,
            model_used=model,
        ))
    db.commit()


async def _worker_loop():
    """持续从队列中取任务处理。"""
    logger.info("AI Worker 已启动，等待任务...")
    while True:
        try:
            doc_id = await _queue.get()
            logger.info("AI Worker: 取出文档 %d，开始处理", doc_id)
            await asyncio.get_event_loop().run_in_executor(_ai_executor, _sync_process_doc, doc_id)
            _queue.task_done()
        except asyncio.CancelledError:
            logger.info("AI Worker 已停止")
            break
        except Exception as e:
            logger.error("AI Worker 循环异常: %s", e)


def _sync_process_doc(doc_id: int):
    """同步版本的 _process_doc，供 run_in_executor 调用。"""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return

        content = (
            db.query(DocumentContent)
            .filter(DocumentContent.document_id == doc_id)
            .order_by(DocumentContent.version.desc())
            .first()
        )
        if not content:
            return

        text = content.cleaned_text or content.raw_text or ""
        if not text.strip():
            return

        logger.info("AI Worker: 开始处理文档 %d (%s)", doc_id, doc.title[:30])

        # 1. 摘要
        try:
            summary = ai_service.generate_summary(text)
            if summary:
                _save_result(db, doc_id, "summary", summary)
        except Exception as e:
            logger.warning("AI Worker: 摘要失败 (doc %d): %s", doc_id, e)

        # 2. 思维导图
        try:
            mindmap = ai_service.generate_mindmap(text)
            if mindmap:
                _save_result(db, doc_id, "mindmap", mindmap)
        except Exception as e:
            logger.warning("AI Worker: 思维导图失败 (doc %d): %s", doc_id, e)

        # 3. 关键信息
        try:
            key_info = ai_service.extract_key_info(text)
            if key_info:
                _save_result(db, doc_id, "key_info", json.dumps(key_info, ensure_ascii=False))
        except Exception as e:
            logger.warning("AI Worker: 关键信息失败 (doc %d): %s", doc_id, e)

        # 4. 智能打标
        try:
            tagging_service.tag_document(db, doc_id)
        except Exception as e:
            logger.warning("AI Worker: 打标失败 (doc %d): %s", doc_id, e)

        logger.info("AI Worker: 文档 %d 全部 AI 处理完成", doc_id)

    except Exception as e:
        logger.error("AI Worker: 处理异常 (doc %d): %s", doc_id, e)
    finally:
        db.close()


def start_worker():
    """启动后台 worker（在 FastAPI startup 中调用）。"""
    global _worker_task
    loop = asyncio.get_event_loop()
    _worker_task = loop.create_task(_worker_loop())
    logger.info("AI Worker 任务已创建")


def stop_worker():
    """停止后台 worker。"""
    global _worker_task
    if _worker_task:
        _worker_task.cancel()
        _worker_task = None
        logger.info("AI Worker 任务已取消")
    _ai_executor.shutdown(wait=False)
