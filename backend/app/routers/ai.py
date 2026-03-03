import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import get_settings, AVAILABLE_MODELS, VISION_MODELS
from ..database import get_db
from ..models import Document, DocumentContent, DocumentTag, DocumentAIResult
from ..schemas import (
    SummaryRequest, SummaryResponse,
    MindmapRequest, MindmapResponse,
    KeyInfoRequest, KeyInfoResponse,
    TagRequest, TagOut, TagListResponse,
    AIResultsResponse,
)
from ..services import ai_service, tagging_service
from ..services.tagging_service import TAG_TAXONOMY

router = APIRouter(prefix="/api/ai", tags=["ai"])
settings = get_settings()
import json

# 创建隔离的线程池处理 LLM 同步调用，防止阻塞主 Event Loop
_api_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="ai_api_pool")


@router.get("/models")
async def list_models():
    """返回可用模型列表。"""
    return {
        "models": AVAILABLE_MODELS,
        "vision_models": VISION_MODELS,
        "default": settings.maas_chat_model or "qwen3.5-plus",
    }


@router.get("/taxonomy")
async def get_taxonomy():
    """返回完整的标签分类体系。"""
    return TAG_TAXONOMY


def _get_doc_text(db: Session, doc_id: int) -> str:
    """获取文档的完整文本内容。"""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    content = (
        db.query(DocumentContent)
        .filter(DocumentContent.document_id == doc_id)
        .order_by(DocumentContent.version.desc())
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="文档内容为空")

    return content.cleaned_text or content.raw_text or ""


def _get_cached(db: Session, doc_id: int, result_type: str) -> Optional[DocumentAIResult]:
    """获取已缓存的 AI 结果。"""
    return (
        db.query(DocumentAIResult)
        .filter(DocumentAIResult.document_id == doc_id, DocumentAIResult.result_type == result_type)
        .first()
    )


def _save_result(db: Session, doc_id: int, result_type: str, content: str, model: str = None):
    """保存或更新 AI 结果。"""
    existing = _get_cached(db, doc_id, result_type)
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


# ---------------------------------------------------------------------------
# 一次性获取所有 AI 结果
# ---------------------------------------------------------------------------

@router.get("/results/{doc_id}", response_model=AIResultsResponse)
async def get_all_results(doc_id: int, db: Session = Depends(get_db)):
    """获取文档所有已生成的 AI 结果。"""
    results = (
        db.query(DocumentAIResult)
        .filter(DocumentAIResult.document_id == doc_id)
        .all()
    )

    resp = AIResultsResponse(doc_id=doc_id)
    for r in results:
        if r.result_type == "summary":
            resp.summary = r.content
            resp.summary_model = r.model_used
        elif r.result_type == "mindmap":
            resp.mindmap = r.content
            resp.mindmap_model = r.model_used
        elif r.result_type == "key_info":
            try:
                resp.key_info = json.loads(r.content)
            except Exception:
                resp.key_info = [r.content]
            resp.key_info_model = r.model_used

    return resp


# ---------------------------------------------------------------------------
# AI 增值功能（支持缓存 + force 重新生成）
# ---------------------------------------------------------------------------

@router.post("/summary", response_model=SummaryResponse)
async def get_summary(payload: SummaryRequest, force: bool = False, db: Session = Depends(get_db)):
    if not force:
        cached = _get_cached(db, payload.doc_id, "summary")
        if cached:
            return SummaryResponse(doc_id=payload.doc_id, summary=cached.content)

    text = _get_doc_text(db, payload.doc_id)
    # 异步执行，不阻塞主线程
    loop = asyncio.get_event_loop()
    summary = await loop.run_in_executor(_api_executor, ai_service.generate_summary, text, payload.model)
    _save_result(db, payload.doc_id, "summary", summary, model=payload.model)
    return SummaryResponse(doc_id=payload.doc_id, summary=summary)


@router.post("/mindmap", response_model=MindmapResponse)
async def get_mindmap(payload: MindmapRequest, force: bool = False, db: Session = Depends(get_db)):
    if not force:
        cached = _get_cached(db, payload.doc_id, "mindmap")
        if cached:
            return MindmapResponse(doc_id=payload.doc_id, mindmap=cached.content)

    text = _get_doc_text(db, payload.doc_id)
    loop = asyncio.get_event_loop()
    mindmap = await loop.run_in_executor(_api_executor, ai_service.generate_mindmap, text, payload.model)
    _save_result(db, payload.doc_id, "mindmap", mindmap, model=payload.model)
    return MindmapResponse(doc_id=payload.doc_id, mindmap=mindmap)


@router.post("/key_info", response_model=KeyInfoResponse)
async def get_key_info(payload: KeyInfoRequest, force: bool = False, db: Session = Depends(get_db)):
    if not force:
        cached = _get_cached(db, payload.doc_id, "key_info")
        if cached:
            try:
                items = json.loads(cached.content)
            except Exception:
                items = [cached.content]
            return KeyInfoResponse(doc_id=payload.doc_id, key_info=items)

    text = _get_doc_text(db, payload.doc_id)
    loop = asyncio.get_event_loop()
    key_info = await loop.run_in_executor(_api_executor, ai_service.extract_key_info, text, payload.model)
    _save_result(db, payload.doc_id, "key_info", json.dumps(key_info, ensure_ascii=False), model=payload.model)
    return KeyInfoResponse(doc_id=payload.doc_id, key_info=key_info)


# ---------------------------------------------------------------------------
# 智能打标
# ---------------------------------------------------------------------------

@router.post("/tags", response_model=TagListResponse)
async def generate_tags(payload: TagRequest, db: Session = Depends(get_db)):
    """手动触发对文档进行智能打标。"""
    doc = db.query(Document).filter(Document.id == payload.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    loop = asyncio.get_event_loop()
    # tagging_service.tag_document 需要传入 db 会话对象。考虑到 Session 不是线程安全的，
    # 最稳妥的方式是在跑完 LLM 后再操作 DB，或者在另一个函数中建立临时 Session 执行。
    # 这里也可以由 thread pool 执行，只短时间查询和写入
    tags = await loop.run_in_executor(_api_executor, tagging_service.tag_document, db, payload.doc_id, payload.model)
    if not tags:
        raise HTTPException(status_code=422, detail="无法生成标签，可能文档内容为空")

    # 重新查询已保存的标签
    db_tags = (
        db.query(DocumentTag)
        .filter(DocumentTag.document_id == payload.doc_id)
        .order_by(DocumentTag.level1, DocumentTag.level2, DocumentTag.level3)
        .all()
    )
    return TagListResponse(doc_id=payload.doc_id, tags=db_tags)


@router.get("/tags/{doc_id}", response_model=TagListResponse)
async def get_tags(doc_id: int, db: Session = Depends(get_db)):
    """获取文档已有的智能标签。"""
    db_tags = (
        db.query(DocumentTag)
        .filter(DocumentTag.document_id == doc_id)
        .order_by(DocumentTag.level1, DocumentTag.level2, DocumentTag.level3)
        .all()
    )
    return TagListResponse(doc_id=doc_id, tags=db_tags)


@router.get("/tags/by-level1/{level1}")
async def get_tags_by_level1(level1: str, db: Session = Depends(get_db)):
    """按一级标签查询所有标签记录及关联文档信息。"""
    from sqlalchemy import func

    db_tags = (
        db.query(DocumentTag)
        .filter(DocumentTag.level1 == level1)
        .order_by(DocumentTag.level2, DocumentTag.level3)
        .all()
    )

    # 构建标签拓扑：按 level2 分组
    topology = {}
    doc_ids = set()
    for tag in db_tags:
        if tag.level2 not in topology:
            topology[tag.level2] = set()
        topology[tag.level2].add(tag.level3)
        doc_ids.add(tag.document_id)

    # 将 set 转为 list
    topology = {k: list(v) for k, v in topology.items()}

    # 查询关联文档基本信息
    docs = []
    if doc_ids:
        doc_records = (
            db.query(Document)
            .filter(Document.id.in_(doc_ids))
            .order_by(Document.created_at.desc())
            .all()
        )
        docs = [
            {
                "id": d.id,
                "title": d.title,
                "doc_type": d.doc_type,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in doc_records
        ]

    return {
        "level1": level1,
        "topology": topology,
        "documents": docs,
        "tag_count": len(db_tags),
    }
