from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import Base, engine
from .routers import ingest, docs, chat, subscriptions, watch_folders, ai, openclaw, profile, assistant, recycle, consistency, messages, products, tools, folders, engineer

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(docs.router)
app.include_router(chat.router)
app.include_router(subscriptions.router)
app.include_router(watch_folders.router)
app.include_router(ai.router)
app.include_router(openclaw.router)
app.include_router(profile.router)
app.include_router(assistant.router)
app.include_router(recycle.router)
app.include_router(consistency.router)
app.include_router(messages.router)
app.include_router(products.router)
app.include_router(tools.router)
app.include_router(folders.router)
app.include_router(engineer.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}


@app.on_event("startup")
async def on_startup():
    # 确保默认用户存在
    from .database import SessionLocal
    from .models import User, DocumentFolder
    db = SessionLocal()
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        db.add(User(id=1, name="default"))
        db.commit()

    db.close()

    # 启动后台服务
    from .services.subscription_service import start_subscription_scheduler
    from .services.folder_watcher import start_folder_watcher
    from .services.ai_worker import start_worker as start_ai_worker
    start_subscription_scheduler()
    start_folder_watcher()
    start_ai_worker()


@app.on_event("shutdown")
async def on_shutdown():
    from .services.subscription_service import stop_subscription_scheduler
    from .services.folder_watcher import stop_folder_watcher
    from .services.ai_worker import stop_worker as stop_ai_worker
    stop_subscription_scheduler()
    stop_folder_watcher()
    stop_ai_worker()


# 挂载前端静态页面（如存在）— 必须放在最后
base_dir = Path(__file__).resolve().parents[2]
frontend_dir = base_dir / "frontend" / "dist"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
