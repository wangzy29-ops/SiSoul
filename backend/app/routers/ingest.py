import os
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Document, DocumentContent
from ..schemas import DocumentOut, NoteCreate, UrlCreate
from ..services import parsing_service, ai_service
from ..services.ai_worker import enqueue as enqueue_ai

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

BASE_DATA_DIR = Path(os.getenv("MEMORYHUB_DATA_DIR", "./data"))


@router.post("/upload_file", response_model=DocumentOut)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user_id = 1
    suffix = Path(file.filename).suffix.lower().lstrip(".")
    allowed_exts = {
        "doc", "docx", "pdf", "xls", "xlsx", "ppt", "pptx", "txt",
        "mp3", "wav", "ogg", "m4a",  # Audio
        "mp4", "avi", "wmv", "webm"   # Video
    }
    if suffix not in allowed_exts:
        raise HTTPException(status_code=400, detail="unsupported file type")

    # 类型映射
    ext_to_type = {
        "doc": "word", "docx": "word",
        "xls": "excel", "xlsx": "excel",
        "ppt": "ppt", "pptx": "ppt",
        "pdf": "pdf", "txt": "txt",
        "mp3": "audio", "wav": "audio", "ogg": "audio", "m4a": "audio",
        "mp4": "video", "avi": "video", "wmv": "video", "webm": "video"
    }
    doc_type = ext_to_type.get(suffix, suffix)

    user_dir = BASE_DATA_DIR / str(user_id) / doc_type / datetime.utcnow().strftime("%Y%m%d")
    user_dir.mkdir(parents=True, exist_ok=True)
    save_path = user_dir / file.filename

    with save_path.open("wb") as f:
        content = await file.read()
        f.write(content)

    doc = Document(
        user_id=user_id,
        title=file.filename,
        doc_type=doc_type,
        status="pending",
        original_path=str(save_path),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if doc_type in {"word", "excel", "ppt", "pdf", "txt"}:
        parsing_service.parse_text_document(db, doc)
    elif doc_type == "audio":
        # 针对音频进行转录并建立内容
        async def process_audio():
            asr_result = await ai_service.transcribe_audio(str(save_path))
            full_content = (
                f"[本地上传]\n[时间: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}]\n[语音转写]\n{asr_result}"
                if asr_result else f"[音频]\n{file.filename}"
            )
            doc_content = DocumentContent(
                document_id=doc.id, raw_text=file.filename, cleaned_text=full_content, version=1
            )
            db.add(doc_content)
            # 音频转录并建索引完成后，才推入 AI 后台队列
            db.refresh(doc) # 刷新 doc_id 等
            enqueue_ai(doc.id)
            
        import asyncio
        asyncio.create_task(process_audio())
    elif doc_type == "video":
        full_content = (
            f"[本地上传]\n[时间: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}]\n[视频]\n{file.filename}\n\n文件路径: {str(save_path)}"
        )
        doc_content = DocumentContent(
            document_id=doc.id, raw_text=file.filename, cleaned_text=full_content, version=1
        )
        db.add(doc_content)
        db.commit()
        parsing_service.chunk_and_index_text(db, doc, full_content)

    # 推入 AI 后台队列（非音频，因为音频是异步转录完后再推入）
    if doc_type != "audio":
        enqueue_ai(doc.id)

    return doc


@router.post("/note", response_model=DocumentOut)
async def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    user_id = 1
    doc = Document(
        user_id=user_id,
        title=payload.title,
        doc_type="note",
        status="pending",
        original_path=None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    content = DocumentContent(
        document_id=doc.id,
        raw_text=payload.content,
        cleaned_text=payload.content,
    )
    db.add(content)
    db.commit()

    parsing_service.chunk_and_index_text(db, doc, payload.content)

    # 推入 AI 后台队列
    enqueue_ai(doc.id)

    return doc


@router.post("/web", response_model=DocumentOut)
async def ingest_web(payload: UrlCreate, db: Session = Depends(get_db)):
    user_id = 1
    doc = Document(
        user_id=user_id,
        title=payload.title or str(payload.url),
        doc_type="web",
        status="pending",
        original_path=str(payload.url),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    parsing_service.fetch_and_parse_web(db, doc, str(payload.url))

    # 推入 AI 后台队列
    enqueue_ai(doc.id)

    return doc
