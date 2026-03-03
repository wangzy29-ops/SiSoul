import os
from functools import lru_cache
from typing import Optional, List

from pydantic_settings import BaseSettings


# 支持的模型列表
AVAILABLE_MODELS = [
    "qwen3.5-plus",
    "kimi-k2.5",
    "glm-5",
    "MiniMax-M2.5",
    "qwen3-max-2026-01-23",
    "qwen3-coder-next",
    "qwen3-coder-plus",
    "glm-4.7",
]

# 支持图片理解的模型
VISION_MODELS = ["qwen3.5-plus", "kimi-k2.5"]


class Settings(BaseSettings):
    app_name: str = "MemoryHub"
    debug: bool = True

    # database
    database_url: str = os.getenv("MEMORYHUB_DATABASE_URL", "sqlite:///./memoryhub.db")

    # vector db
    chroma_persist_dir: str = os.getenv("MEMORYHUB_CHROMA_DIR", "./chroma_data")

    # redis / broker
    redis_url: str = os.getenv("MEMORYHUB_REDIS_URL", "redis://localhost:6379/0")

    # maas / model — OpenAI 兼容协议
    maas_provider: str = os.getenv("MEMORYHUB_MAAS_PROVIDER", "dashscope")
    maas_base_url: str = os.getenv("MEMORYHUB_MAAS_BASE_URL", "https://coding.dashscope.aliyuncs.com/v1")
    maas_api_key: Optional[str] = os.getenv("DASHSCOPE_API_KEY", "sk-sp-85947db8e9624bb7bbd973c68a1b5451")
    maas_chat_model: str = os.getenv("MEMORYHUB_CHAT_MODEL", "qwen3.5-plus")
    maas_embedding_model: str = os.getenv("MEMORYHUB_EMBED_MODEL", "text-embedding-v1")

    # DingTalk API (for downloading files via downloadCode)
    dingtalk_app_key: Optional[str] = os.getenv("DINGTALK_APP_KEY", "dingz67ga5k01rdspntx")
    dingtalk_app_secret: Optional[str] = os.getenv("DINGTALK_APP_SECRET", "DrJU7nDLBjtkeQ25nfvRARZs77tqiAGrz1Lp5HYcz-U3HBuQtTM6obTXM0xoPaS8")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
