from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Subscription, Document
from ..schemas import SubscriptionCreate, SubscriptionOut, SubscriptionUpdate
from ..services import parsing_service

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


@router.get("/", response_model=List[SubscriptionOut])
async def list_subscriptions(db: Session = Depends(get_db)):
    user_id = 1
    subs = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    return subs


@router.post("/", response_model=SubscriptionOut)
async def create_subscription(payload: SubscriptionCreate, db: Session = Depends(get_db)):
    user_id = 1
    sub = Subscription(
        user_id=user_id,
        url_pattern=payload.url_pattern,
        feed_type=payload.feed_type,
        enabled=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/{sub_id}", response_model=SubscriptionOut)
async def update_subscription(sub_id: int, payload: SubscriptionUpdate, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="订阅不存在")
    if payload.url_pattern is not None:
        sub.url_pattern = payload.url_pattern
    if payload.feed_type is not None:
        sub.feed_type = payload.feed_type
    if payload.enabled is not None:
        sub.enabled = payload.enabled
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/{sub_id}")
async def delete_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="订阅不存在")
    db.delete(sub)
    db.commit()
    return {"detail": "删除成功"}


@router.post("/{sub_id}/check")
async def check_subscription_now(sub_id: int, db: Session = Depends(get_db)):
    """手动触发一次订阅检查。"""
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="订阅不存在")

    from ..services.subscription_service import check_single_subscription
    new_docs = check_single_subscription(db, sub)
    sub.last_checked_at = datetime.utcnow()
    db.commit()
    return {"detail": f"检查完成，新增 {new_docs} 篇文档"}
