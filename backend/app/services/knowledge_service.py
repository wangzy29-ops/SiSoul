"""知识目录分类服务。

负责：
1. 初始化知识目录文件夹结构
2. 调用 AI 对文件进行分类
3. 自动关联文件到对应文件夹
4. 同步创建文件系统目录
"""
import os
import json
import logging
from typing import Optional, Tuple, Dict, List
from pathlib import Path

from sqlalchemy.orm import Session

from ..models import Document, DocumentFolder
from .ai_service import _call_llm, _truncate_for_prompt

logger = logging.getLogger(__name__)

# 知识目录根路径
KNOWLEDGE_BASE_DIR = Path("/Users/wangziyu/MemoryHub/知识 Knowledge")

# 知识目录结构定义
KNOWLEDGE_STRUCTURE = {
    "MyLife": {
        "name": "生活",
        "children": {
            "我的饮食": "菜谱、营养计划、餐厅打卡记录",
            "我的健康": "体检报告、医疗记录、睡眠与生理数据",
            "我的运动": "训练计划、运动数据追踪、健身目标",
            "我的衣柜": "衣服照片、穿搭记录、尺码记录、购物清单、穿搭灵感图库",
            "我的出行": "行程单、护照签证扫描件、旅行攻略与游记",
            "我的日常": "设备说明书、日常生活技巧",
        }
    },
    "MyCourse": {
        "name": "学习",
        "children": {
            "论文书籍": "电子书、文章剪报、播客及视频的文字提炼，源文件链接",
            "网页知识": "网页、视频、音频、图片的多模态文字提炼，源文件链接",
            "大模型相关": "大模型相关知识",
            "我的笔记": "控制台新建，富文本笔记",
        }
    },
    "MyTask": {
        "name": "任务",
        "children": {
            "每日任务": "按日维度，通过各个AI助理生成具体的日程记录",
        }
    },
    "MyAction": {
        "name": "行为",
        "children": {
            "App浏览记录": "通过openclaw操作各业务app的记录，分析每个消息的行为动作，并按App维度梳理：操作频率、使用深度",
        }
    },
    "MyAsset": {
        "name": "资产",
        "children": {
            "财务账单": "收支明细、税务文件、报销单据",
            "法律文件": "个人身份证明电子版、各类协议与合同",
            "我的数字资产": "软件授权码、加密钱包记录、重要账号备份",
        }
    },
}


def init_knowledge_folders(db: Session, user_id: int = 1) -> Dict[str, DocumentFolder]:
    """初始化知识目录文件夹结构。
    
    返回: 文件夹名称到文件夹对象的映射
    """
    folders_map = {}
    
    for root_key, root_info in KNOWLEDGE_STRUCTURE.items():
        # 创建一级文件夹
        root_folder = db.query(DocumentFolder).filter(
            DocumentFolder.user_id == user_id,
            DocumentFolder.name == root_info["name"],
            DocumentFolder.parent_id == None,
        ).first()
        
        if not root_folder:
            root_folder = DocumentFolder(
                user_id=user_id,
                name=root_info["name"],
                parent_id=None,
            )
            db.add(root_folder)
            db.commit()
            db.refresh(root_folder)
            logger.info(f"创建知识目录: {root_info['name']}")
        
        folders_map[root_info["name"]] = root_folder
        
        # 创建二级文件夹
        for child_name, child_desc in root_info["children"].items():
            child_folder = db.query(DocumentFolder).filter(
                DocumentFolder.user_id == user_id,
                DocumentFolder.name == child_name,
                DocumentFolder.parent_id == root_folder.id,
            ).first()
            
            if not child_folder:
                child_folder = DocumentFolder(
                    user_id=user_id,
                    name=child_name,
                    parent_id=root_folder.id,
                )
                db.add(child_folder)
                db.commit()
                db.refresh(child_folder)
                logger.info(f"创建知识子目录: {root_info['name']}/{child_name}")
            
            folders_map[f"{root_info['name']}/{child_name}"] = child_folder
    
    # 同步创建文件系统目录
    sync_filesystem_folders()
    
    return folders_map


def sync_filesystem_folders():
    """同步创建文件系统目录。"""
    try:
        for root_key, root_info in KNOWLEDGE_STRUCTURE.items():
            root_path = KNOWLEDGE_BASE_DIR / root_info["name"]
            root_path.mkdir(parents=True, exist_ok=True)
            
            for child_name in root_info["children"].keys():
                child_path = root_path / child_name
                child_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"文件系统目录同步完成: {KNOWLEDGE_BASE_DIR}")
    except PermissionError as e:
        logger.warning(f"文件系统目录创建失败（权限问题）: {e}")
    except Exception as e:
        logger.warning(f"文件系统目录创建失败: {e}")


def classify_document(db: Session, doc: Document, user_id: int = 1) -> Tuple[Optional[DocumentFolder], Optional[str]]:
    """对文档进行 AI 分类，返回目标文件夹和分类理由。
    
    Args:
        db: 数据库会话
        doc: 文档对象
        user_id: 用户ID
        
    Returns:
        (目标文件夹, 分类理由) 或 (None, None)
    """
    # 确保知识目录已初始化
    folders_map = init_knowledge_folders(db, user_id)
    
    # 获取文档内容
    content = ""
    if doc.contents:
        content = doc.contents[0].cleaned_text or doc.contents[0].raw_text or ""
    
    if not content and doc.title:
        content = doc.title
    
    if not content:
        logger.warning(f"文档 {doc.id} 没有可分类的内容")
        return None, None
    
    # 构建 AI 分类 prompt
    prompt = _build_classification_prompt(doc.title, content)
    
    # 调用 AI
    result = _call_llm(prompt, model="qwen3.5-plus")
    
    if not result:
        logger.warning(f"文档 {doc.id} AI 分类失败")
        return None, None
    
    # 解析结果
    folder, reason = _parse_classification_result(result, folders_map)
    
    return folder, reason


def _build_classification_prompt(title: str, content: str) -> str:
    """构建分类 prompt。"""
    # 构建目录结构描述
    structure_desc = []
    for root_key, root_info in KNOWLEDGE_STRUCTURE.items():
        children_desc = "、".join(root_info["children"].keys())
        structure_desc.append(f"- {root_info['name']}：包含 {children_desc}")
    
    structure_text = "\n".join(structure_desc)
    
    # 截断内容
    truncated_content = _truncate_for_prompt(content, max_bytes=50000)
    
    prompt = f"""你是一个文件分类助手。请根据以下文档内容，将其分类到最合适的知识目录中。

## 知识目录结构
{structure_text}

## 文档信息
标题：{title}

内容摘要：
{truncated_content[:3000]}

## 分类要求
1. 仔细分析文档内容的主题和用途
2. 选择最匹配的一级目录和二级目录
3. 如果文档内容不明确或无法分类，请选择"我的日常"

## 输出格式（必须是严格的JSON格式）
{{"level1": "一级目录名称", "level2": "二级目录名称", "reason": "分类理由（简短说明为什么这样分类）"}}

请只输出JSON，不要输出其他内容。"""
    
    return prompt


def _parse_classification_result(result: str, folders_map: Dict[str, DocumentFolder]) -> Tuple[Optional[DocumentFolder], Optional[str]]:
    """解析 AI 分类结果。"""
    try:
        # 尝试提取 JSON
        result = result.strip()
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        
        data = json.loads(result)
        level1 = data.get("level1", "")
        level2 = data.get("level2", "")
        reason = data.get("reason", "")
        
        # 查找对应文件夹
        folder_key = f"{level1}/{level2}"
        if folder_key in folders_map:
            return folders_map[folder_key], reason
        
        # 如果找不到，尝试只匹配二级目录
        for key, folder in folders_map.items():
            if folder.name == level2:
                return folder, reason
        
        logger.warning(f"未找到匹配的文件夹: {folder_key}")
        return None, reason
        
    except json.JSONDecodeError as e:
        logger.warning(f"解析分类结果失败: {e}, result: {result}")
        return None, None


def auto_classify_and_move(db: Session, doc: Document, user_id: int = 1) -> bool:
    """自动分类文档并移动到对应文件夹。
    
    Args:
        db: 数据库会话
        doc: 文档对象
        user_id: 用户ID
        
    Returns:
        是否成功分类
    """
    folder, reason = classify_document(db, doc, user_id)
    
    if folder:
        doc.folder_id = folder.id
        db.commit()
        db.refresh(doc)
        logger.info(f"文档 {doc.id} 已分类到 {folder.name}, 理由: {reason}")
        return True
    
    return False


def get_folder_path(folder: DocumentFolder, db: Session) -> Path:
    """获取文件夹对应的文件系统路径。"""
    parts = [folder.name]
    
    # 向上遍历父文件夹
    current = folder
    while current.parent_id:
        parent = db.query(DocumentFolder).filter(DocumentFolder.id == current.parent_id).first()
        if parent:
            parts.insert(0, parent.name)
            current = parent
        else:
            break
    
    return KNOWLEDGE_BASE_DIR / "/".join(parts)
