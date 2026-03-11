import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, DocumentContent, Chunk
from ..schemas import DocumentOut, DocumentUpdate, NoteUpdate
from ..vectorstore import get_collection

router = APIRouter(prefix="/api/docs", tags=["docs"])


@router.get("/", response_model=List[DocumentOut])
async def list_documents(
    doc_type: Optional[str] = None,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    user_id = 1
    q = db.query(Document).filter(Document.user_id == user_id)
    if doc_type:
        q = q.filter(Document.doc_type == doc_type)
    if folder_id is not None:
        q = q.filter(Document.folder_id == folder_id)
    docs = q.order_by(Document.created_at.desc()).all()
    return docs


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


@router.get("/{doc_id}/content")
async def get_document_content(doc_id: int, db: Session = Depends(get_db)):
    content = (
        db.query(DocumentContent)
        .filter(DocumentContent.document_id == doc_id)
        .order_by(DocumentContent.version.desc())
        .first()
    )
    if not content:
        return {"content": ""}
    return {"content": content.cleaned_text or content.raw_text or ""}


@router.put("/{doc_id}", response_model=DocumentOut)
async def update_document(doc_id: int, payload: DocumentUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    if payload.title is not None:
        doc.title = payload.title
    db.commit()
    db.refresh(doc)
    return doc


@router.put("/{doc_id}/content")
async def update_document_content(
    doc_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
):
    """更新笔记/文档的标题和内容，重新建立向量索引。"""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    if payload.title is not None:
        doc.title = payload.title

    if payload.content is not None:
        # 更新内容
        content = (
            db.query(DocumentContent)
            .filter(DocumentContent.document_id == doc_id)
            .order_by(DocumentContent.version.desc())
            .first()
        )
        if content:
            new_version = DocumentContent(
                document_id=doc_id,
                version=content.version + 1,
                raw_text=payload.content,
                cleaned_text=payload.content,
            )
        else:
            new_version = DocumentContent(
                document_id=doc_id,
                version=1,
                raw_text=payload.content,
                cleaned_text=payload.content,
            )
        db.add(new_version)

        # 删除旧的 chunks 和向量
        old_chunks = db.query(Chunk).filter(Chunk.document_id == doc_id).all()
        old_ids = [f"chunk-{doc_id}-{c.id}" for c in old_chunks]
        if old_ids:
            try:
                collection = get_collection()
                collection.delete(ids=old_ids)
            except Exception:
                pass
        for c in old_chunks:
            db.delete(c)

        doc.status = "pending"
        db.commit()

        # 重新索引
        from ..services import parsing_service
        parsing_service.chunk_and_index_text(db, doc, payload.content)
    else:
        db.commit()

    db.refresh(doc)
    return {"id": doc.id, "title": doc.title, "status": doc.status}


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """删除文档 - 移入回收站"""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 检查是否已在回收站
    from ..models.core import RecycleBin
    existing = db.query(RecycleBin).filter(RecycleBin.document_id == doc_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="文档已在回收站")

    # 移入回收站（保留文档，只添加回收站记录）
    expire_at = datetime.utcnow() + timedelta(days=30)
    recycle_item = RecycleBin(
        user_id=doc.user_id,
        document_id=doc_id,
        original_folder_id=doc.folder_id,  # 保存原始文件夹
        deleted_at=datetime.utcnow(),
        expire_at=expire_at,
    )
    db.add(recycle_item)
    
    # 清除文档的 folder_id，使其从正常列表中消失
    doc.folder_id = None
    
    db.commit()
    return {"detail": "已移入回收站"}
