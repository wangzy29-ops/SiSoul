from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..services import web_service

router = APIRouter(prefix="/api/tools", tags=["tools"])

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class ScrapeRequest(BaseModel):
    url: str
    max_age: int = 0

@router.post("/search")
async def perform_search(payload: SearchRequest):
    """
    通过阿里云 API 执行联网搜索
    """
    try:
        results = web_service.web_search(query=payload.query, top_k=payload.top_k)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scrape")
async def perform_scrape(payload: ScrapeRequest):
    """
    通过阿里云 API 解析网页正文
    """
    try:
        text = web_service.scrape_page(url=payload.url, max_age=payload.max_age)
        if not text:
            raise HTTPException(status_code=400, detail="解析失败或内容为空")
        return {"content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
