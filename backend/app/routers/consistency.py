from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ConsistencyCheck, Document
from ..schemas import ConsistencyCheckOut

router = APIRouter(prefix="/api/consistency", tags=["consistency"])


@router.get("/", response_model=list[ConsistencyCheckOut])
async def list_consistency_checks(status: str = None, db: Session = Depends(get_db)):
    """获取一致性检查结果"""
    user_id = 1
    query = db.query(ConsistencyCheck).filter(ConsistencyCheck.user_id == user_id)

    if status:
        query = query.filter(ConsistencyCheck.status == status)

    checks = query.order_by(ConsistencyCheck.created_at.desc()).all()
    return checks


@router.post("/detect-duplicates")
async def detect_duplicates(db: Session = Depends(get_db)):
    """检测重复文档（基于文档标题相似度）"""
    user_id = 1
    documents = db.query(Document).filter(Document.user_id == user_id).all()

    # 简单的重复检测：相同标题的文档
    title_map = {}
    for doc in documents:
        if doc.title not in title_map:
            title_map[doc.title] = []
        title_map[doc.title].append(doc.id)

    duplicates = []
    for title, doc_ids in title_map.items():
        if len(doc_ids) > 1:
            # 创建检查记录
            check = ConsistencyCheck(
                user_id=user_id,
                doc_id_1=doc_ids[0],
                doc_id_2=doc_ids[1],
                conflict_type="duplicate",
                description=f"发现重复标题的文档: {title}",
                status="pending",
            )
            db.add(check)
            duplicates.append(check)

    db.commit()
    for c in duplicates:
        db.refresh(c)

    return {"detected": len(duplicates), "checks": duplicates}


@router.post("/{check_id}/resolve")
async def resolve_check(check_id: int, db: Session = Depends(get_db)):
    """解决一致性检查"""
    user_id = 1
    check = db.query(ConsistencyCheck).filter(ConsistencyCheck.id == check_id, ConsistencyCheck.user_id == user_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="一致性检查记录不存在")

    check.status = "resolved"
    db.commit()
    db.refresh(check)
    return check


@router.post("/{check_id}/ignore")
async def ignore_check(check_id: int, db: Session = Depends(get_db)):
    """忽略一致性检查"""
    user_id = 1
    check = db.query(ConsistencyCheck).filter(ConsistencyCheck.id == check_id, ConsistencyCheck.user_id == user_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="一致性检查记录不存在")

    check.status = "ignored"
    db.commit()
    db.refresh(check)
    return check
