"""OpenClaw 钉钉消息接收端点。

接收来自 OpenClaw 钉钉分身转发的多模态消息。
"""
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import openclaw_service

router = APIRouter(prefix="/api/openclaw", tags=["openclaw"])


class MessagePayload(BaseModel):
    """单条消息。"""
    message_type: str  # text/image/audio/video/file/richtext/link
    content: str  # 消息内容或描述
    sender_id: str  # 发送者 ID
    conversation_id: Optional[str] = None  # 会话 ID（群聊时有值）
    media_url: Optional[str] = None  # 媒体文件 URL
    file_name: Optional[str] = None  # 文件名
    timestamp: Optional[int] = None  # 时间戳（毫秒）
    metadata: Optional[dict] = None  # 额外元数据


class IngestRequest(BaseModel):
    """消息摄入请求。"""
    messages: List[MessagePayload]


class IngestResponse(BaseModel):
    """消息摄入响应。"""
    status: str
    processed: int
    results: List[dict]


@router.post("/ingest", response_model=IngestResponse)
async def ingest_messages(payload: IngestRequest):
    """接收来自 OpenClaw 的钉钉消息并存入知识库。
    
    支持的消息类型:
    - text: 文本消息
    - image: 图片消息（需提供 media_url）
    - audio: 语音消息（需提供 media_url）
    - video: 视频消息（需提供 media_url）
    - file: 文件消息（需提供 media_url 和 file_name）
    - richtext: 富文本消息
    - link: 链接消息（需提供 media_url 作为链接地址）
    """
    if not payload.messages:
        raise HTTPException(status_code=400, detail="消息列表不能为空")

    results = []
    for msg in payload.messages:
        result = await openclaw_service.process_openclaw_message(
            message_type=msg.message_type,
            content=msg.content,
            sender_id=msg.sender_id,
            conversation_id=msg.conversation_id,
            media_url=msg.media_url,
            file_name=msg.file_name,
            timestamp=msg.timestamp,
            metadata=msg.metadata,
        )
        results.append(result)

    processed = sum(1 for r in results if r.get("status") == "ok")
    return IngestResponse(status="ok", processed=processed, results=results)


@router.post("/message")
async def ingest_single_message(msg: MessagePayload):
    """接收单条消息的简化接口。"""
    result = await openclaw_service.process_openclaw_message(
        message_type=msg.message_type,
        content=msg.content,
        sender_id=msg.sender_id,
        conversation_id=msg.conversation_id,
        media_url=msg.media_url,
        file_name=msg.file_name,
        timestamp=msg.timestamp,
        metadata=msg.metadata,
    )
    return result


@router.get("/health")
async def openclaw_health():
    """OpenClaw 集成健康检查。"""
    return {"status": "ok", "service": "openclaw-integration"}
