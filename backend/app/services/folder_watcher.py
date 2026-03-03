"""本地文件夹监控服务。

使用 watchdog 库监控指定文件夹，当有新文件出现时自动导入知识库。
如果 watchdog 不可用，则退化为定时轮询方式。
"""
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import List, Set

from typing import Dict, List, Set

from ..config import get_settings
from ..database import SessionLocal
from ..models import Document, WatchFolder
from . import parsing_service

logger = logging.getLogger(__name__)
settings = get_settings()

SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"}
_POLL_INTERVAL = 30  # 轮询间隔(秒)
_known_files: Dict[int, Set[str]] = {}  # folder_id -> set of known file paths

_watcher_running = False
_watcher_thread = None


def _get_supported_files(folder_path: str) -> Set[str]:
    """递归扫描文件夹中所有支持格式的文件。"""
    files = set()
    try:
        for root, dirs, filenames in os.walk(folder_path):
            for fn in filenames:
                ext = os.path.splitext(fn)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    files.add(os.path.join(root, fn))
    except Exception as e:
        logger.warning("扫描文件夹 %s 失败: %s", folder_path, e)
    return files


def _import_file(db, file_path: str, user_id: int = 1) -> None:
    """将单个文件导入知识库。"""
    # 检查是否已导入
    exists = db.query(Document).filter(Document.original_path == file_path).first()
    if exists:
        return

    filename = os.path.basename(file_path)
    suffix = Path(file_path).suffix.lower().lstrip(".")
    if suffix not in {"doc", "docx", "pdf", "xls", "xlsx", "ppt", "pptx", "txt"}:
        return

    # 类型映射: doc/docx→word, xls/xlsx→excel, ppt/pptx→ppt
    ext_to_type = {
        "doc": "word", "docx": "word",
        "xls": "excel", "xlsx": "excel",
        "ppt": "ppt", "pptx": "ppt",
        "pdf": "pdf", "txt": "txt"
    }
    doc_type = ext_to_type.get(suffix, suffix)

    doc = Document(
        user_id=user_id,
        title=filename,
        doc_type=doc_type,
        status="pending",
        original_path=file_path,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        parsing_service.parse_text_document(db, doc)
        logger.info("自动导入文件: %s (doc_id=%d)", filename, doc.id)
    except Exception as e:
        logger.warning("自动导入文件失败 %s: %s", file_path, e)
        doc.status = "failed"
        db.commit()


def _poll_loop():
    """后台轮询循环。"""
    global _watcher_running, _known_files
    while _watcher_running:
        try:
            db = SessionLocal()
            folders = db.query(WatchFolder).filter(WatchFolder.enabled == True).all()

            for folder in folders:
                if not os.path.isdir(folder.path):
                    continue

                current_files = _get_supported_files(folder.path)
                known = _known_files.get(folder.id, set())

                new_files = current_files - known
                for fp in sorted(new_files):
                    _import_file(db, fp, user_id=folder.user_id)

                _known_files[folder.id] = current_files

            db.close()
        except Exception as e:
            logger.error("文件夹监控循环出错: %s", e)

        for _ in range(_POLL_INTERVAL):
            if not _watcher_running:
                break
            time.sleep(1)


def start_folder_watcher():
    """启动文件夹监控后台线程。"""
    global _watcher_running, _watcher_thread
    if _watcher_running:
        return
    _watcher_running = True

    # 首次启动时加载已有文件清单（避免重复导入）
    try:
        db = SessionLocal()
        folders = db.query(WatchFolder).filter(WatchFolder.enabled == True).all()
        for folder in folders:
            if os.path.isdir(folder.path):
                _known_files[folder.id] = _get_supported_files(folder.path)
        db.close()
    except Exception:
        pass

    _watcher_thread = threading.Thread(target=_poll_loop, daemon=True, name="folder-watcher")
    _watcher_thread.start()
    logger.info("文件夹监控已启动")


def stop_folder_watcher():
    global _watcher_running
    _watcher_running = False
