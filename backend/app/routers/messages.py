"""消息记录路由。"""
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Message
from ..schemas import MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/", response_model=List[MessageOut])
async def list_messages(
    sub_type: Optional[str] = None,
    sender_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """列出消息记录，支持按 sub_type / sender_id 过滤。"""
    user_id = 1
    q = db.query(Message).filter(Message.user_id == user_id)
    if sub_type:
        q = q.filter(Message.sub_type == sub_type)
    if sender_id:
        q = q.filter(Message.sender_id == sender_id)
    return q.order_by(Message.created_at.desc()).limit(limit).all()


@router.get("/{msg_id}", response_model=MessageOut)
async def get_message(msg_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")
    return msg


@router.delete("/{msg_id}")
async def delete_message(msg_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="消息不存在")
    db.delete(msg)
    db.commit()
    return {"detail": "删除成功"}
