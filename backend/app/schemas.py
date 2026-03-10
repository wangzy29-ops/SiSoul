from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel, HttpUrl


# ---------------------------------------------------------------------------
# 文档
# ---------------------------------------------------------------------------

class DocumentOut(BaseModel):
    id: int
    title: str
    doc_type: str
    status: str
    file_size: Optional[int] = None  # 新增字段
    folder_id: Optional[int] = None  # 文件夹ID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: Optional[str] = None


# ---------------------------------------------------------------------------
# 笔记
# ---------------------------------------------------------------------------

class NoteCreate(BaseModel):
    title: str
    content: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


# ---------------------------------------------------------------------------
# 网页
# ---------------------------------------------------------------------------

class UrlCreate(BaseModel):
    url: HttpUrl
    title: Optional[str] = None


# ---------------------------------------------------------------------------
# 订阅
# ---------------------------------------------------------------------------

class SubscriptionCreate(BaseModel):
    url_pattern: str
    feed_type: str = "rss"  # rss / api / custom


class SubscriptionOut(BaseModel):
    id: int
    url_pattern: str
    feed_type: str
    enabled: bool
    last_checked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SubscriptionUpdate(BaseModel):
    url_pattern: Optional[str] = None
    feed_type: Optional[str] = None
    enabled: Optional[bool] = None


# ---------------------------------------------------------------------------
# 文件夹监控
# ---------------------------------------------------------------------------

class WatchFolderCreate(BaseModel):
    path: str


class WatchFolderOut(BaseModel):
    id: int
    path: str
    enabled: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    query: str
    user_id: int = 1
    top_k: int = 5
    scope: str = "global"  # global / doc
    doc_id: Optional[int] = None


class ChatAnswerChunk(BaseModel):
    document_id: int
    chunk_id: int
    content: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    chunks: List[ChatAnswerChunk]


# ---------------------------------------------------------------------------
# AI 增值
# ---------------------------------------------------------------------------

class SummaryRequest(BaseModel):
    doc_id: int
    model: Optional[str] = None


class SummaryResponse(BaseModel):
    doc_id: int
    summary: str


class MindmapRequest(BaseModel):
    doc_id: int
    model: Optional[str] = None


class MindmapResponse(BaseModel):
    doc_id: int
    mindmap: str  # markdown格式的思维导图


class KeyInfoRequest(BaseModel):
    doc_id: int
    model: Optional[str] = None


class KeyInfoResponse(BaseModel):
    doc_id: int
    key_info: List[str]


# ---------------------------------------------------------------------------
# 智能打标
# ---------------------------------------------------------------------------

class TagRequest(BaseModel):
    doc_id: int
    model: Optional[str] = None


class TagOut(BaseModel):
    id: int
    document_id: int
    level1: str
    level2: str
    level3: str
    model_used: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TagListResponse(BaseModel):
    doc_id: int
    tags: List[TagOut]


# ---------------------------------------------------------------------------
# AI 结果持久化
# ---------------------------------------------------------------------------

class DocumentAIResultOut(BaseModel):
    id: int
    document_id: int
    result_type: str
    content: str
    model_used: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AIResultsResponse(BaseModel):
    doc_id: int
    summary: Optional[str] = None
    mindmap: Optional[str] = None
    key_info: Optional[List[str]] = None
    summary_model: Optional[str] = None
    mindmap_model: Optional[str] = None
    key_info_model: Optional[str] = None


# ---------------------------------------------------------------------------
# 画像
# ---------------------------------------------------------------------------

class ProfileCreate(BaseModel):
    category: str  # basic/hobby/health/language
    item_key: str
    item_value: str
    source: Optional[str] = "user_input"


class ProfileOut(BaseModel):
    id: int
    user_id: int
    category: str
    item_key: str
    item_value: str
    source: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    category: Optional[str] = None
    item_key: Optional[str] = None
    item_value: Optional[str] = None
    source: Optional[str] = None


# ---------------------------------------------------------------------------
# AI助理
# ---------------------------------------------------------------------------

class AIAssistantItemCreate(BaseModel):
    item_type: str  # summary/reminder/push/event
    title: str
    content: Optional[str] = None
    item_date: datetime
    extra_json: Optional[str] = None


class AIAssistantItemOut(BaseModel):
    id: int
    user_id: int
    item_type: str
    title: str
    content: Optional[str] = None
    item_date: datetime
    extra_json: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReminderCreate(BaseModel):
    title: str
    content: Optional[str] = None
    remind_at: datetime
    repeat: Optional[str] = "none"
    enabled: Optional[bool] = True


class ReminderOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: Optional[str] = None
    remind_at: datetime
    repeat: str
    enabled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    remind_at: Optional[datetime] = None
    repeat: Optional[str] = None
    enabled: Optional[bool] = None


# ---------------------------------------------------------------------------
# 遗忘
# ---------------------------------------------------------------------------

class RecycleBinOut(BaseModel):
    id: int
    user_id: int
    document_id: int
    deleted_at: Optional[datetime] = None
    expire_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConsistencyCheckOut(BaseModel):
    id: int
    user_id: int
    doc_id_1: Optional[int] = None
    doc_id_2: Optional[int] = None
    conflict_type: str
    description: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# 消息记录
# ---------------------------------------------------------------------------

class MessageOut(BaseModel):
    id: int
    user_id: int
    sub_type: str  # text / image_msg / action_msg / collection
    sender_id: Optional[str] = None
    conversation_id: Optional[str] = None
    send_time: Optional[datetime] = None
    text_content: Optional[str] = None
    action_desc: Optional[str] = None
    related_doc_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# 商品记录
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    url: HttpUrl
    title: Optional[str] = None

class ProductOut(BaseModel):
    id: int
    user_id: int
    title: str
    original_platform: Optional[str] = None  # 识别入口平台（smzdm）
    platform: Optional[str] = None  # 实际电商平台
    source_url: str
    main_image_url: Optional[str] = None
    main_image_path: Optional[str] = None
    price: Optional[str] = None
    specs_json: Optional[str] = None
    
    scraped_text: Optional[str] = None
    level1_tag: Optional[str] = None
    level2_tag: Optional[str] = None
    level3_tag: Optional[str] = None
    other_info_json: Optional[str] = None
    
    ai_summary: Optional[str] = None
    ai_mindmap: Optional[str] = None
    ai_intro: Optional[str] = None

    send_time: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
