"""商品记录路由。"""
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import ProductOut, ProductCreate
from ..services import openclaw_service

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/", response_model=List[ProductOut])
async def list_products(
    platform: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """列出商品记录，支持按 platform 过滤。"""
    user_id = 1
    q = db.query(Product).filter(Product.user_id == user_id)
    if platform:
        q = q.filter(Product.platform == platform)
    return q.order_by(Product.created_at.desc()).limit(limit).all()


@router.post("/", response_model=ProductOut)
async def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    """手动录入商品链接进行抓取解析（仅支持smzdm.com链接）。"""
    url_str = str(product_in.url)
    
    # 检查是否为smzdm链接
    platform = openclaw_service._get_ecommerce_platform(url_str)
    
    if not platform:
        raise HTTPException(
            status_code=400, 
            detail="当前仅支持什么值得买(smzdm.com)链接，请输入smzdm商品链接"
        )
        
    # 调用底层封装的通用抓取落库逻辑
    product = await openclaw_service._parse_and_save_product(
        db=db,
        url=url_str,
        fallback_title=product_in.title,
        platform=platform,
        sender_id="web_console",
        send_time=datetime.now()
    )
    
    if not product:
        raise HTTPException(status_code=500, detail="商品页面抓取或解析失败")
        
    return product

@router.post("/{product_id}/summary")
async def generate_product_summary(product_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    from ..services.ai_service import summary_text
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
        
    text = product.scraped_text or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="商品缺失有效的原网页文字信息，无法摘要")
        
    res = summary_text(text)
    product.ai_summary = res
    db.commit()
    return {"summary": res}

@router.post("/{product_id}/mindmap")
async def generate_product_mindmap(product_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    from ..services.ai_service import generate_mindmap
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
        
    text = product.scraped_text or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="商品缺失有效的原网页文字信息，无法生成导图")
        
    res = generate_mindmap(text)
    product.ai_mindmap = res
    db.commit()
    return {"mindmap": res}

@router.post("/{product_id}/intro")
async def generate_product_intro_route(product_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    from ..services.ai_service import generate_product_intro
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
        
    # fallback 使用 url 获取不到 title 则取抓取后自动生成的 title
    title = product.title or ""
    text = product.scraped_text or ""
    
    res = generate_product_intro(title, text)
    product.ai_intro = res
    db.commit()
    return {"intro": res}

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    return product


@router.get("/{product_id}/image")
async def get_product_image(product_id: int, db: Session = Depends(get_db)):
    """返回商品主图文件。"""
    from fastapi import HTTPException
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    if not product.main_image_path or not os.path.exists(product.main_image_path):
        raise HTTPException(status_code=404, detail="商品图片不存在")
    return FileResponse(product.main_image_path)


@router.delete("/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    # 删除本地图片
    if product.main_image_path and os.path.exists(product.main_image_path):
        try:
            os.remove(product.main_image_path)
        except Exception:
            pass
    db.delete(product)
    db.commit()
    return {"detail": "删除成功"}
