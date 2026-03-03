from typing import List, Optional

from sqlalchemy.orm import Session

from ..models import Chunk
from ..vectorstore import query as vs_query
from . import embedding_service


def search_chunks(
    db: Session,
    user_id: int,
    query_text: str,
    top_k: int = 5,
    document_id: Optional[int] = None,
):
    embedding = embedding_service.embed_texts([query_text])[0]

    where = {"user_id": user_id}
    if document_id is not None:
        where["document_id"] = document_id

    result = vs_query(embedding=embedding, where=where, top_k=top_k)

    ids = result.get("ids", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    documents = result.get("documents", [[]])[0]
    distances = result.get("distances", [[]])[0]

    items = []
    for meta, doc_text, dist in zip(metadatas, documents, distances):
        if not meta:
            continue
        chunk_id = meta.get("chunk_id")
        if chunk_id is None:
            continue
        chunk = db.query(Chunk).filter(Chunk.id == chunk_id).first()
        if not chunk:
            continue
        score = float(dist) if dist is not None else 0.0
        items.append((chunk, doc_text, score))

    return items
