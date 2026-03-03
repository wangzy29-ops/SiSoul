"""LLM 对话服务：基于检索到的上下文生成回答。

使用 OpenAI 兼容协议调用百炼平台模型（默认 qwen3.5-plus），失败时退化为简单拼接。
"""
import logging
from typing import List, Optional

import httpx

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

DEFAULT_MODEL = "qwen3.5-plus"


def _build_messages(query: str, contexts: List[str]) -> List[dict]:
    """构建符合 OpenAI 消息格式的消息列表。"""
    context_text = "\n\n".join([f"[片段{i+1}]\n{c}" for i, c in enumerate(contexts)])
    system_content = (
        "你是一个个人多模态记忆库助手，基于提供的知识片段回答用户问题。"
        "尽量使用中文回答，并在无法从片段中得到答案时明确说明。"
    )
    user_content = f"知识片段:\n{context_text}\n\n用户问题:\n{query}\n\n请基于以上内容给出简洁、结构化的回答。"

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


def _call_openai_compatible(messages: List[dict], model: Optional[str] = None) -> Optional[str]:
    """通过 OpenAI 兼容协议调用百炼模型。"""
    api_key = settings.maas_api_key
    base_url = settings.maas_base_url
    if not api_key or not base_url:
        return None

    use_model = model or settings.maas_chat_model or DEFAULT_MODEL

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": use_model,
        "messages": messages,
        "temperature": 0.7,
    }

    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        choices = data.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content", "")
            if content:
                return content
    except Exception as e:
        logger.warning("LLM 调用失败 (model=%s): %s", use_model, e)

    return None


def generate_answer(query: str, contexts: List[str], model: Optional[str] = None) -> str:
    """根据检索到的上下文与用户问题生成回答。

    优先使用 OpenAI 兼容协议调用百炼模型，失败时退化为直接拼接片段。"""

    contexts = [c for c in contexts if c.strip()]
    if not contexts:
        return "目前知识库中没有检索到相关内容。"

    messages = _build_messages(query, contexts)
    answer = _call_openai_compatible(messages, model=model)
    if answer:
        return answer

    # fallback：简单拼接若干片段
    joined = "\n\n".join(contexts[:3])
    return f"（未能调用LLM，以下为检索到的原始片段汇总）\n\n{joined}"
