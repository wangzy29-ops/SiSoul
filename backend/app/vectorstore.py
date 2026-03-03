from typing import List, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings

from .config import get_settings


_settings = get_settings()
_client = chromadb.PersistentClient(path=_settings.chroma_persist_dir, settings=ChromaSettings(anonymized_telemetry=False))
_collection_name = "memoryhub_chunks"


def get_collection():
    return _client.get_or_create_collection(name=_collection_name)


def upsert_chunks(
    ids: List[str],
    embeddings: List[List[float]],
    metadatas: List[dict],
    documents: List[str],
) -> None:
    collection = get_collection()
    collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)


def query(
    embedding: List[float],
    where: Optional[dict] = None,
    top_k: int = 5,
):
    collection = get_collection()
    result = collection.query(query_embeddings=[embedding], n_results=top_k, where=where)
    return result
