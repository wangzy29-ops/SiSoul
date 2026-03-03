from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ChatRequest, ChatResponse, ChatAnswerChunk
from ..services import retrieval_service, llm_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if payload.scope == "doc" and not payload.doc_id:
        return ChatResponse(answer="需要提供文档ID", chunks=[])

    items = retrieval_service.search_chunks(
        db=db,
        user_id=payload.user_id,
        query_text=payload.query,
        top_k=payload.top_k,
        document_id=payload.doc_id if payload.scope == "doc" else None,
    )

    if not items:
        return ChatResponse(answer="没有检索到相关内容", chunks=[])

    chunks_out = []
    context_texts = []
    for chunk, doc_text, score in items:
        context_texts.append(chunk.content)
        chunks_out.append(
            ChatAnswerChunk(
                document_id=chunk.document_id,
                chunk_id=chunk.id,
                content=chunk.content,
                score=score,
            )
        )

    answer = llm_service.generate_answer(payload.query, context_texts)

    return ChatResponse(answer=answer, chunks=chunks_out)
