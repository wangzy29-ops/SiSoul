from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, Boolean
from sqlalchemy.orm import relationship

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, default="default")
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="user")


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String(50), nullable=False)  # openclaw/local_upload/web/note/subscription
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    documents = relationship("Document", back_populates="source")


class DocumentFolder(Base):
    """文档文件夹（支持层级分组）。"""
    __tablename__ = "document_folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    parent = relationship("DocumentFolder", remote_side="DocumentFolder.id", foreign_keys=[parent_id], back_populates="children")
    children = relationship("DocumentFolder", back_populates="parent", foreign_keys=[parent_id])
    documents = relationship("Document", back_populates="folder", foreign_keys="Document.folder_id")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    folder_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True, index=True)

    title = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)  # doc/xls/ppt/pdf/txt/image/other/video/audio/web/note/message/product
    status = Column(String(30), default="pending")  # pending/parsed/failed

    original_path = Column(Text, nullable=True)
    extra_meta = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    source = relationship("Source", back_populates="documents")
    folder = relationship("DocumentFolder", back_populates="documents", foreign_keys=[folder_id])
    contents = relationship("DocumentContent", back_populates="document")
    chunks = relationship("Chunk", back_populates="document")


class DocumentContent(Base):
    __tablename__ = "document_contents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))

    version = Column(Integer, default=1)
    raw_text = Column(Text, nullable=True)
    cleaned_text = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="contents")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True)

    content = Column(Text, nullable=False)
    position = Column(Integer, nullable=False)
    section_path = Column(String(255), nullable=True)

    modality = Column(String(30), default="text")  # text/image/audio/video
    layer = Column(String(30), default="detail")  # summary/detail/tag

    embedding_index = Column(String(100), nullable=True)

    document = relationship("Document", back_populates="chunks")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    url_pattern = Column(Text, nullable=False)
    feed_type = Column(String(30), default="rss")  # rss/api/custom
    last_checked_at = Column(DateTime, nullable=True)
    enabled = Column(Boolean, default=True)


class WatchFolder(Base):
    __tablename__ = "watch_folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    path = Column(Text, nullable=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True)

    key = Column(String(100), nullable=False)
    value = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== OpenClaw 消息记录 ====================

class Message(Base):
    """OpenClaw 钉钉消息记录（消息动作日志）。"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    # sub_type: text / image_msg / action_msg / collection
    sub_type = Column(String(30), nullable=False, default="text")

    sender_id = Column(String(100), nullable=True)
    conversation_id = Column(String(100), nullable=True)
    send_time = Column(DateTime, nullable=True)

    text_content = Column(Text, nullable=True)
    action_desc = Column(Text, nullable=True)

    related_doc_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    related_doc = relationship("Document", foreign_keys=[related_doc_id])


# ==================== 商品记录 ====================

class Product(Base):
    """电商商品记录（smzdm聚合平台入口）。"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    title = Column(String(500), nullable=False)
    original_platform = Column(String(50), nullable=True)  # 识别入口平台（smzdm）
    platform = Column(String(50), nullable=True)  # 实际电商平台: taobao/tmall/jd/pdd/vip/douyin/bieyang/unknown
    source_url = Column(Text, nullable=False)
    main_image_url = Column(Text, nullable=True)
    main_image_path = Column(Text, nullable=True)
    price = Column(String(100), nullable=True)
    specs_json = Column(Text, nullable=True)

    # ---------------- AI 解析结果 ----------------
    scraped_text = Column(Text, nullable=True) # 网页原文
    level1_tag = Column(String(50), nullable=True) # 行业一级细分
    level2_tag = Column(String(50), nullable=True) # 行业二级细分
    level3_tag = Column(String(50), nullable=True) # 行业三级细分
    other_info_json = Column(Text, nullable=True) # AI 提炼补充资料

    # AI 生成的长文本衍生衍生信息
    ai_summary = Column(Text, nullable=True) # AI 摘要
    ai_mindmap = Column(Text, nullable=True) # MD 格式思维导图
    ai_intro = Column(Text, nullable=True)   # 联网商品介绍(评价、竞品等综合)

    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    sender_id = Column(String(100), nullable=True)
    send_time = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


# ==================== 画像相关模型 ====================

class Profile(Base):
    """用户画像数据"""
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    category = Column(String(50), nullable=False)  # basic/hobby/health/language
    item_key = Column(String(100), nullable=False)
    item_value = Column(Text, nullable=False)

    source = Column(String(50), default="user_input")  # user_input/ai_extracted

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


# ==================== AI助理相关模型 ====================

class AIAssistantItem(Base):
    """AI助理条目（订阅摘要、周期总结、兴趣推送、重要事件）"""
    __tablename__ = "ai_assistant_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    item_type = Column(String(50), nullable=False)  # summary/reminder/push/event
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    item_date = Column(DateTime, nullable=False)  # 关联日期，用于日历视图

    extra_json = Column(Text, nullable=True)  # JSON存储额外信息

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class Reminder(Base):
    """用户提醒"""
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    remind_at = Column(DateTime, nullable=False)

    repeat = Column(String(30), default="none")  # none/daily/weekly/monthly
    enabled = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


# ==================== 遗忘模块相关模型 ====================

class RecycleBin(Base):
    """回收站 - 存放已删除的文档"""
    __tablename__ = "recycle_bin"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True)

    deleted_at = Column(DateTime, default=datetime.utcnow)
    expire_at = Column(DateTime, nullable=True)  # 30天后自动清理

    user = relationship("User")


class ConsistencyCheck(Base):
    """一致性检查 - 检测重复或冲突的信息"""
    __tablename__ = "consistency_checks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    doc_id_1 = Column(Integer, ForeignKey("documents.id"), nullable=True)
    doc_id_2 = Column(Integer, ForeignKey("documents.id"), nullable=True)

    conflict_type = Column(String(50), nullable=False)  # duplicate/conflict/missing
    description = Column(Text, nullable=True)
    status = Column(String(30), default="pending")  # pending/resolved/ignored

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


# ==================== 智能打标 ====================

class DocumentTag(Base):
    """文档智能标签（三级标签体系）。"""
    __tablename__ = "document_tags"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True)

    level1 = Column(String(50), nullable=False)   # 一级标签（如"基础画像"）
    level2 = Column(String(100), nullable=False)   # 二级标签（如"职业/身份"）
    level3 = Column(String(200), nullable=False)   # 三级标签（AI 生成）

    model_used = Column(String(100), nullable=True)  # 使用的模型名称
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document")


# ==================== AI 结果持久化 ====================

class DocumentAIResult(Base):
    """文档 AI 生成结果持久化（摘要/思维导图/关键信息）。"""
    __tablename__ = "document_ai_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True)

    result_type = Column(String(30), nullable=False)   # summary / mindmap / key_info
    content = Column(Text, nullable=False)              # JSON 或纯文本
    model_used = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document")

