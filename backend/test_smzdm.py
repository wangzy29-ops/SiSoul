import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.openclaw_service import _parse_and_save_product

async def main():
    db = SessionLocal()
    url = "https://www.smzdm.com/p/169062213/#hfeeds"
    try:
        product = await _parse_and_save_product(
            db=db,
            url=url,
            fallback_title="Test title",
            platform="smzdm",
            sender_id="test",
            send_time=123123123
        )
        print("Product title:", product.title)
        print("Product main image:", product.main_image_url)
        print("Product actual platform:", product.platform)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
