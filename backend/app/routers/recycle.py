import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, RecycleBin, DocumentContent, Chunk
from ..schemas import RecycleBinOut
from ..vectorstore import get_collection

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
        original_folder_id=doc.folder_id,
        deleted_at=datetime.utcnow(),
        expire_at=expire_at,
    )
    db.add(recycle_item)
    
    # 清除文档的 folder_id，使其从正常列表中消失
    doc.folder_id = None
    
    db.commit()
    db.refresh(recycle_item)

    return {"detail": "已移入回收站", "recycle_item": recycle_item}


@router.post("/{doc_id}/restore")
async def restore_from_recycle(doc_id: int, db: Session = Depends(get_db)):
    """从回收站恢复文档 - 还原到原来的文件夹"""
    user_id = 1
    recycle_item = (
        db.query(RecycleBin)
        .filter(RecycleBin.document_id == doc_id, RecycleBin.user_id == user_id)
        .first()
    )
    if not recycle_item:
        raise HTTPException(status_code=404, detail="回收站中不存在该文档")

    # 恢复文档的 folder_id
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if doc:
        doc.folder_id = recycle_item.original_folder_id

    # 删除回收站记录
    db.delete(recycle_item)
    db.commit()

    return {"detail": "已恢复文档", "restored_folder_id": recycle_item.original_folder_id}


@router.delete("/{doc_id}")
async def permanent_delete(doc_id: int, db: Session = Depends(get_db)):
    """彻底删除回收站中的文档 - 删除数据库记录和底层文件"""
    user_id = 1
    recycle_item = (
        db.query(RecycleBin)
        .filter(RecycleBin.document_id == doc_id, RecycleBin.user_id == user_id)
        .first()
    )
    if not recycle_item:
        raise HTTPException(status_code=404, detail="回收站中不存在该文档")

    # 获取文档
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user_id).first()
    
    if doc:
        # 1. 删除向量
        chunks = db.query(Chunk).filter(Chunk.document_id == doc_id).all()
        chunk_ids = [f"chunk-{doc_id}-{c.id}" for c in chunks]
        if chunk_ids:
            try:
                collection = get_collection()
                collection.delete(ids=chunk_ids)
            except Exception:
                pass

        # 2. 删除关联记录
        from ..models.core import Message, Annotation, ConsistencyCheck
        
        # 消息解除关联
        db.query(Message).filter(Message.related_doc_id == doc_id).update({Message.related_doc_id: None})
        
        # 删除其他关联记录
        db.query(Annotation).filter(Annotation.document_id == doc_id).delete()
        db.query(ConsistencyCheck).filter(
            (ConsistencyCheck.doc_id_1 == doc_id) | (ConsistencyCheck.doc_id_2 == doc_id)
        ).delete()
        
        # 3. 删除内容和分块
        db.query(Chunk).filter(Chunk.document_id == doc_id).delete()
        db.query(DocumentContent).filter(DocumentContent.document_id == doc_id).delete()

        # 4. 删除底层文件
        if doc.original_path and os.path.exists(doc.original_path):
            try:
                os.remove(doc.original_path)
            except Exception as e:
                print(f"删除文件失败: {e}")

        # 5. 删除文档记录
        db.delete(doc)

    # 删除回收站记录
    db.delete(recycle_item)
    db.commit()

    return {"detail": "已永久删除"}
