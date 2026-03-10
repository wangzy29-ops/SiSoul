from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, DocumentFolder

router = APIRouter(prefix="/api/folders", tags=["folders"])


# ---------- Schemas ----------

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None


class FolderOut(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    doc_count: int = 0

    class Config:
        from_attributes = True


class MoveDocRequest(BaseModel):
    doc_ids: List[int]
    folder_id: Optional[int]  # None = 移到根目录


# ---------- Routes ----------

@router.get("/", response_model=List[FolderOut])
async def list_folders(db: Session = Depends(get_db)):
    user_id = 1
    folders = db.query(DocumentFolder).filter(DocumentFolder.user_id == user_id).order_by(DocumentFolder.created_at.asc()).all()
    result = []
    for f in folders:
        count = db.query(Document).filter(Document.folder_id == f.id).count()
        result.append(FolderOut(id=f.id, name=f.name, parent_id=f.parent_id, doc_count=count))
    return result


@router.post("/", response_model=FolderOut)
async def create_folder(payload: FolderCreate, db: Session = Depends(get_db)):
    user_id = 1
    # 同一层级不允许同名
    existing = db.query(DocumentFolder).filter(
        DocumentFolder.user_id == user_id,
        DocumentFolder.name == payload.name.strip(),
        DocumentFolder.parent_id == payload.parent_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="同名文件夹已存在")
    folder = DocumentFolder(
        user_id=user_id,
        name=payload.name.strip(),
        parent_id=payload.parent_id,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderOut(id=folder.id, name=folder.name, parent_id=folder.parent_id, doc_count=0)


@router.delete("/{folder_id}")
async def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(DocumentFolder).filter(DocumentFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")
    # 将该文件夹内的文档移到根目录
    db.query(Document).filter(Document.folder_id == folder_id).update({Document.folder_id: None})
    # 将子文件夹的 parent 改为当前文件夹的 parent（上移一级）
    db.query(DocumentFolder).filter(DocumentFolder.parent_id == folder_id).update(
        {DocumentFolder.parent_id: folder.parent_id}
    )
    db.delete(folder)
    db.commit()
    return {"detail": "删除成功"}


@router.post("/move_docs")
async def move_docs(payload: MoveDocRequest, db: Session = Depends(get_db)):
    """批量移动文件到指定文件夹（folder_id=None 表示移到根目录）。"""
    if payload.folder_id is not None:
        target = db.query(DocumentFolder).filter(DocumentFolder.id == payload.folder_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="目标文件夹不存在")
    db.query(Document).filter(Document.id.in_(payload.doc_ids)).update(
        {Document.folder_id: payload.folder_id},
        synchronize_session=False,
    )
    db.commit()
    return {"detail": f"已移动 {len(payload.doc_ids)} 个文件"}


@router.post("/init_knowledge")
async def init_knowledge_folders(db: Session = Depends(get_db)):
    """初始化知识目录文件夹结构。"""
    from ..services.knowledge_service import init_knowledge_folders as _init
    folders = _init(db, user_id=1)
    return {"detail": f"已初始化 {len(folders)} 个知识目录文件夹"}


@router.post("/classify/{doc_id}")
async def classify_document(doc_id: int, db: Session = Depends(get_db)):
    """手动触发文档分类。"""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    from ..services.knowledge_service import classify_document as _classify
    folder, reason = _classify(db, doc)
    
    if folder:
        return {
            "folder_id": folder.id,
            "folder_name": folder.name,
            "reason": reason
        }
    else:
        return {"detail": "分类失败", "reason": reason}
