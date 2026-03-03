from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AIAssistantItem, Reminder
from ..schemas import (
    AIAssistantItemCreate,
    AIAssistantItemOut,
    ReminderCreate,
    ReminderOut,
    ReminderUpdate,
)

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


# ==================== AIAssistantItem ====================

@router.get("/items", response_model=List[AIAssistantItemOut])
async def list_assistant_items(
    item_type: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
):
    """获取AI助理条目，可按类型和日期范围过滤"""
    user_id = 1
    query = db.query(AIAssistantItem).filter(AIAssistantItem.user_id == user_id)

    if item_type:
        query = query.filter(AIAssistantItem.item_type == item_type)

    if start_date:
        query = query.filter(AIAssistantItem.item_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(AIAssistantItem.item_date <= datetime.fromisoformat(end_date))

    items = query.order_by(AIAssistantItem.item_date.desc()).all()
    return items


@router.post("/items", response_model=AIAssistantItemOut)
async def create_assistant_item(payload: AIAssistantItemCreate, db: Session = Depends(get_db)):
    """创建AI助理条目（订阅摘要、周期总结、兴趣推送、重要事件）"""
    user_id = 1
    item = AIAssistantItem(
        user_id=user_id,
        item_type=payload.item_type,
        title=payload.title,
        content=payload.content,
        item_date=payload.item_date,
        extra_json=payload.extra_json,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# ==================== Reminder ====================

@router.get("/reminders", response_model=List[ReminderOut])
async def list_reminders(
    enabled: bool = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
):
    """获取提醒列表，可按启用状态和日期范围过滤"""
    user_id = 1
    query = db.query(Reminder).filter(Reminder.user_id == user_id)

    if enabled is not None:
        query = query.filter(Reminder.enabled == enabled)

    if start_date:
        query = query.filter(Reminder.remind_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Reminder.remind_at <= datetime.fromisoformat(end_date))

    reminders = query.order_by(Reminder.remind_at.asc()).all()
    return reminders


@router.post("/reminders", response_model=ReminderOut)
async def create_reminder(payload: ReminderCreate, db: Session = Depends(get_db)):
    """创建新提醒"""
    user_id = 1
    reminder = Reminder(
        user_id=user_id,
        title=payload.title,
        content=payload.content,
        remind_at=payload.remind_at,
        repeat=payload.repeat or "none",
        enabled=payload.enabled if payload.enabled is not None else True,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
async def update_reminder(reminder_id: int, payload: ReminderUpdate, db: Session = Depends(get_db)):
    """更新提醒"""
    user_id = 1
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == user_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="提醒不存在")

    if payload.title is not None:
        reminder.title = payload.title
    if payload.content is not None:
        reminder.content = payload.content
    if payload.remind_at is not None:
        reminder.remind_at = payload.remind_at
    if payload.repeat is not None:
        reminder.repeat = payload.repeat
    if payload.enabled is not None:
        reminder.enabled = payload.enabled

    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """删除提醒"""
    user_id = 1
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == user_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="提醒不存在")

    db.delete(reminder)
    db.commit()
    return {"detail": "删除成功"}
