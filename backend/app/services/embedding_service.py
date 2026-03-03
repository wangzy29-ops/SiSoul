import hashlib
from typing import List

from ..config import get_settings

settings = get_settings()

try:
    import dashscope
    from dashscope import TextEmbedding

    _HAS_DASHSCOPE = True
except Exception:  # pragma: no cover
    dashscope = None  # type: ignore
    TextEmbedding = None  # type: ignore
    _HAS_DASHSCOPE = False


def _fake_embedding(text: str, dim: int = 128) -> List[float]:
    h = hashlib.sha256(text.encode("utf-8")).digest()
    nums = list(h) * (dim // len(h) + 1)
    nums = nums[:dim]
    s = sum(nums) or 1
    return [n / s for n in nums]


def _embed_with_dashscope(texts: List[str]) -> List[List[float]]:
    if not (_HAS_DASHSCOPE and settings.maas_api_key and settings.maas_provider == "dashscope"):
        return [_fake_embedding(t) for t in texts]

    dashscope.api_key = settings.maas_api_key  # type: ignore
    try:
        resp = TextEmbedding.call(  # type: ignore
            model=settings.maas_embedding_model or "text-embedding-v1",
            input=texts,
        )
    except Exception:
        return [_fake_embedding(t) for t in texts]

    try:
        embeddings = resp.output["embeddings"]  # type: ignore
        vectors = [item["embedding"] for item in embeddings]
        if len(vectors) != len(texts):
            return [_fake_embedding(t) for t in texts]
        return vectors
    except Exception:
        return [_fake_embedding(t) for t in texts]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """为文本生成向量，优先使用阿里云百炼DashScope，失败时退化为本地伪向量。"""

    if not texts:
        return []

    if _HAS_DASHSCOPE and settings.maas_api_key:
        return _embed_with_dashscope(texts)

    return [_fake_embedding(t) for t in texts]
