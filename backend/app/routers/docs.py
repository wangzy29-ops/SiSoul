import os
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
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 删除向量
    chunks = db.query(Chunk).filter(Chunk.document_id == doc_id).all()
    chunk_ids = [f"chunk-{doc_id}-{c.id}" for c in chunks]
    if chunk_ids:
        try:
            collection = get_collection()
            collection.delete(ids=chunk_ids)
        except Exception:
            pass

    # 清除外键约束记录
    from ..models.core import Message, Annotation, RecycleBin, ConsistencyCheck
    
    # 消息解除关联
    db.query(Message).filter(Message.related_doc_id == doc_id).update({Message.related_doc_id: None})
    
    # 删除其他关联记录
    db.query(Annotation).filter(Annotation.document_id == doc_id).delete()
    db.query(RecycleBin).filter(RecycleBin.document_id == doc_id).delete()
    db.query(ConsistencyCheck).filter(
        (ConsistencyCheck.doc_id_1 == doc_id) | (ConsistencyCheck.doc_id_2 == doc_id)
    ).delete()
    
    # 删除内容和分块
    db.query(Chunk).filter(Chunk.document_id == doc_id).delete()
    db.query(DocumentContent).filter(DocumentContent.document_id == doc_id).delete()

    # 删除本地文件
    if doc.original_path and os.path.exists(doc.original_path):
        try:
            os.remove(doc.original_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"detail": "删除成功"}
