from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, RecycleBin
from ..schemas import RecycleBinOut

router = APIRouter(prefix="/api/recycle", tags=["recycle"])


@router.get("/", response_model=list[RecycleBinOut])
async def list_recycle_bin(db: Session = Depends(get_db)):
    """获取回收站列表"""
    user_id = 1
    now = datetime.utcnow()
    recycle_items = (
        db.query(RecycleBin)
        .filter(RecycleBin.user_id == user_id, RecycleBin.expire_at > now)
        .order_by(RecycleBin.deleted_at.desc())
        .all()
    )
    return recycle_items


@router.post("/{doc_id}")
async def move_to_recycle(doc_id: int, db: Session = Depends(get_db)):
    """将文档移入回收站"""
    user_id = 1
    # 检查文档是否存在
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 检查是否已在回收站
    existing = (
        db.query(RecycleBin)
        .filter(RecycleBin.document_id == doc_id, RecycleBin.user_id == user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="文档已在回收站")

    # 创建回收站记录（30天后自动清理）
    expire_at = datetime.utcnow() + timedelta(days=30)
    recycle_item = RecycleBin(
        user_id=user_id,
        document_id=doc_id,
        deleted_at=datetime.utcnow(),
        expire_at=expire_at,
    )
    db.add(recycle_item)
    db.commit()
    db.refresh(recycle_item)

    return {"detail": "已移入回收站", "recycle_item": recycle_item}


@router.post("/{doc_id}/restore")
async def restore_from_recycle(doc_id: int, db: Session = Depends(get_db)):
    """从回收站恢复文档"""
    user_id = 1
    recycle_item = (
        db.query(RecycleBin)
        .filter(RecycleBin.document_id == doc_id, RecycleBin.user_id == user_id)
        .first()
    )
    if not recycle_item:
        raise HTTPException(status_code=404, detail="回收站中不存在该文档")

    db.delete(recycle_item)
    db.commit()

    return {"detail": "已恢复文档"}


@router.delete("/{doc_id}")
async def permanent_delete(doc_id: int, db: Session = Depends(get_db)):
    """彻底删除回收站中的文档"""
    user_id = 1
    recycle_item = (
        db.query(RecycleBin)
        .filter(RecycleBin.document_id == doc_id, RecycleBin.user_id == user_id)
        .first()
    )
    if not recycle_item:
        raise HTTPException(status_code=404, detail="回收站中不存在该文档")

    # 删除文档本身
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user_id).first()
    if doc:
        db.delete(doc)

    db.delete(recycle_item)
    db.commit()

    return {"detail": "已永久删除"}
