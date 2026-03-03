"""订阅源定时检查服务。

支持 RSS 和普通网页链接的定期检查，发现新内容自动入库。
"""
import logging
import threading
import time
from datetime import datetime
from typing import List

import httpx

from ..config import get_settings
from ..database import SessionLocal
from ..models import Document, Subscription
from . import parsing_service

logger = logging.getLogger(__name__)
settings = get_settings()

_CHECK_INTERVAL = 600  # 默认 10 分钟检查一次


def check_single_subscription(db, sub: Subscription) -> int:
    """检查单个订阅源，返回新增文档数量。"""
    new_count = 0
    urls = _discover_urls(sub)

    for url, title in urls:
        # 检查是否已入库
        exists = (
            db.query(Document)
            .filter(Document.original_path == url, Document.user_id == sub.user_id)
            .first()
        )
        if exists:
            continue

        doc = Document(
            user_id=sub.user_id,
            title=title or url,
            doc_type="web",
            status="pending",
            original_path=url,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        try:
            parsing_service.fetch_and_parse_web(db, doc, url)
            new_count += 1
        except Exception as e:
            logger.warning("订阅 %s 抓取失败: %s", url, e)
            doc.status = "failed"
            db.commit()

    sub.last_checked_at = datetime.utcnow()
    db.commit()
    return new_count


def _discover_urls(sub: Subscription) -> List[tuple]:
    """从订阅源发现新链接，返回 [(url, title), ...]。"""
    results = []
    try:
        resp = httpx.get(sub.url_pattern, timeout=15, follow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("订阅源请求失败 %s: %s", sub.url_pattern, e)
        return results

    content_type = resp.headers.get("content-type", "")

    if sub.feed_type == "rss" or "xml" in content_type:
        results = _parse_rss(resp.text, sub.url_pattern)
    else:
        # 普通网页：提取页面中的链接
        results = _parse_html_links(resp.text, sub.url_pattern)

    return results[:20]  # 单次最多20条


def _parse_rss(xml_text: str, base_url: str) -> List[tuple]:
    """简单的 RSS/Atom 解析。"""
    results = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(xml_text, "html.parser")
        items = soup.find_all("item") or soup.find_all("entry")
        for item in items:
            link_tag = item.find("link")
            title_tag = item.find("title")
            link = ""
            if link_tag:
                link = link_tag.get("href") or link_tag.string or ""
            title = title_tag.string if title_tag else ""
            link = str(link).strip()
            if link:
                results.append((link, str(title).strip()))
    except Exception as e:
        logger.warning("RSS 解析失败: %s", e)
    return results


def _parse_html_links(html: str, base_url: str) -> List[tuple]:
    """从普通 HTML 页面提取正文链接。"""
    results = []
    try:
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("#") or href.startswith("javascript:"):
                continue
            full_url = urljoin(base_url, href)
            title = a.get_text(strip=True) or full_url
            results.append((full_url, title))
    except Exception as e:
        logger.warning("HTML 链接提取失败: %s", e)
    return results


# ---------------------------------------------------------------------------
# 后台调度线程
# ---------------------------------------------------------------------------

_scheduler_running = False
_scheduler_thread = None


def _scheduler_loop():
    """后台循环，定期检查所有启用的订阅。"""
    global _scheduler_running
    while _scheduler_running:
        try:
            db = SessionLocal()
            subs = db.query(Subscription).filter(Subscription.enabled == True).all()
            for sub in subs:
                try:
                    new_count = check_single_subscription(db, sub)
                    if new_count > 0:
                        logger.info("订阅 %s 新增 %d 篇文档", sub.url_pattern, new_count)
                except Exception as e:
                    logger.warning("检查订阅 %d 出错: %s", sub.id, e)
            db.close()
        except Exception as e:
            logger.error("订阅调度循环出错: %s", e)

        # 等待间隔，每秒检查一次是否需要停止
        for _ in range(_CHECK_INTERVAL):
            if not _scheduler_running:
                break
            time.sleep(1)


def start_subscription_scheduler():
    """启动后台订阅检查线程。"""
    global _scheduler_running, _scheduler_thread
    if _scheduler_running:
        return
    _scheduler_running = True
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="sub-scheduler")
    _scheduler_thread.start()
    logger.info("订阅调度器已启动")


def stop_subscription_scheduler():
    global _scheduler_running
    _scheduler_running = False
