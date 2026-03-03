from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Profile
from ..schemas import ProfileCreate, ProfileOut, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profiles"])


@router.get("/", response_model=List[ProfileOut])
async def list_profiles(category: str = None, db: Session = Depends(get_db)):
    """获取所有画像信息，可按分类过滤"""
    user_id = 1
    query = db.query(Profile).filter(Profile.user_id == user_id)
    if category:
        query = query.filter(Profile.category == category)
    profiles = query.order_by(Profile.category, Profile.item_key).all()
    return profiles


@router.get("/{profile_id}", response_model=ProfileOut)
async def get_profile(profile_id: int, db: Session = Depends(get_db)):
    """获取单个画像条目"""
    user_id = 1
    profile = db.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="画像条目不存在")
    return profile


@router.post("/", response_model=ProfileOut)
async def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    """创建新的画像条目"""
    user_id = 1
    profile = Profile(
        user_id=user_id,
        category=payload.category,
        item_key=payload.item_key,
        item_value=payload.item_value,
        source=payload.source or "user_input",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/{profile_id}", response_model=ProfileOut)
async def update_profile(profile_id: int, payload: ProfileUpdate, db: Session = Depends(get_db)):
    """更新画像条目"""
    user_id = 1
    profile = db.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="画像条目不存在")

    if payload.category is not None:
        profile.category = payload.category
    if payload.item_key is not None:
        profile.item_key = payload.item_key
    if payload.item_value is not None:
        profile.item_value = payload.item_value
    if payload.source is not None:
        profile.source = payload.source

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}")
async def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """删除画像条目"""
    user_id = 1
    profile = db.query(Profile).filter(Profile.id == profile_id, Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="画像条目不存在")

    db.delete(profile)
    db.commit()
    return {"detail": "删除成功"}
