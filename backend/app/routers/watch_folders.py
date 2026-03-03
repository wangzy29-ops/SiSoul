import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import WatchFolder
from ..schemas import WatchFolderCreate, WatchFolderOut

router = APIRouter(prefix="/api/watch_folders", tags=["watch_folders"])


@router.get("/", response_model=List[WatchFolderOut])
async def list_watch_folders(db: Session = Depends(get_db)):
    user_id = 1
    folders = db.query(WatchFolder).filter(WatchFolder.user_id == user_id).all()
    return folders


@router.post("/", response_model=WatchFolderOut)
async def add_watch_folder(payload: WatchFolderCreate, db: Session = Depends(get_db)):
    user_id = 1
    folder_path = os.path.expanduser(payload.path)
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail="路径不存在或不是文件夹")

    # 检查是否重复
    exists = db.query(WatchFolder).filter(
        WatchFolder.user_id == user_id, WatchFolder.path == folder_path
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="该文件夹已在监控列表中")

    wf = WatchFolder(user_id=user_id, path=folder_path, enabled=True)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.delete("/{folder_id}")
async def remove_watch_folder(folder_id: int, db: Session = Depends(get_db)):
    wf = db.query(WatchFolder).filter(WatchFolder.id == folder_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="监控文件夹不存在")
    db.delete(wf)
    db.commit()
    return {"detail": "删除成功"}
