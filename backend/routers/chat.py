"""Chat endpoint with SSE streaming, conversation history, and source citations."""

import asyncio
import json
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from openai import APIError

from backend.database import execute, fetch_all, fetch_one
from backend.models import ChatRequest
from backend.services.embeddings import (
    embed_query_gemini_sync,
    embed_query_openai,
)
from backend.services.llm import (
    build_rag_prompt,
    create_openai_text_stream,
    gemini_text_stream,
)
from backend.services import vectorstore
from backend.settings import settings

logger = logging.getLogger("ragapp")
router = APIRouter()


def _extract_key(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    key = authorization.removeprefix("Bearer ").strip()
    return key or None


@router.post("/chat", response_model=None)
async def chat(
    body: ChatRequest,
    authorization: Annotated[str | None, Header()] = None,
):
    api_key = _extract_key(authorization)
    if not api_key:
        return JSONResponse(
            status_code=401,
            content={"error": "Missing or invalid Authorization header (use Bearer token)."},
        )

    p = body.provider
    model_trim = body.model.strip()
    q = body.question.strip()
    doc_id = body.document_id.strip()

    # ---- Validate document exists and is ready ----
    doc = await fetch_one("SELECT * FROM documents WHERE id = ?", (doc_id,))
    if not doc:
        return JSONResponse(
            status_code=404,
            content={"error": "Unknown document_id. Ingest the document first."},
        )
    if doc["status"] != "ready":
        return JSONResponse(
            status_code=400,
            content={"error": f"Document is not ready. Current status: {doc['status']}"},
        )
    if doc["provider"] != p:
        return JSONResponse(
            status_code=400,
            content={"error": "Provider does not match the document you indexed. Switch provider or re-index."},
        )

    emb_model = doc.get("embedding_model", "")
    if not emb_model:
        return JSONResponse(status_code=500, content={"error": "Corrupt document record."})

    # ---- Embed query ----
    try:
        if p == "openai":
            q_emb = await embed_query_openai(api_key, emb_model, q)
        else:
            q_emb = await asyncio.to_thread(embed_query_gemini_sync, api_key, emb_model, q)
    except Exception as e:
        return JSONResponse(status_code=502, content={"error": f"Query embedding failed: {e!s}"})

    # ---- Retrieve chunks ----
    try:
        contexts = vectorstore.query_similar(doc_id, q_emb, top_k=settings.rag_top_k)
    except Exception as e:
        return JSONResponse(status_code=404, content={"error": f"Could not load vector index: {e!s}"})

    if not contexts:
        return JSONResponse(
            status_code=400,
            content={"error": "No matching context found. Try re-indexing the document."},
        )

    # ---- Resolve or create conversation ----
    conversation_id = body.conversation_id
    if conversation_id:
        conv = await fetch_one(
            "SELECT id, document_id FROM conversations WHERE id = ?",
            (conversation_id,),
        )
        if not conv:
            return JSONResponse(status_code=404, content={"error": "Conversation not found."})
        if conv["document_id"] != doc_id:
            return JSONResponse(
                status_code=400,
                content={"error": "Conversation does not belong to the specified document."},
            )
    else:
        conversation_id = str(uuid.uuid4())
        title = q[:80] + ("…" if len(q) > 80 else "")
        await execute(
            "INSERT INTO conversations (id, document_id, title) VALUES (?, ?, ?)",
            (conversation_id, doc_id, title),
        )

    # ---- Load conversation history for multi-turn ----
    history_rows = await fetch_all(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (conversation_id,),
    )
    history = [{"role": r["role"], "content": r["content"]} for r in history_rows]
    # Truncate to configured max
    history = history[-(settings.max_conversation_history):]

    # ---- Save user message ----
    user_msg_id = str(uuid.uuid4())
    await execute(
        "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)",
        (user_msg_id, conversation_id, q),
    )

    # ---- Build prompt ----
    prompt = build_rag_prompt(contexts, q, history=history)

    # ---- Stream response via SSE ----
    assistant_msg_id = str(uuid.uuid4())

    async def event_generator():
        # First: send sources
        yield {
            "event": "sources",
            "data": json.dumps({"type": "sources", "chunks": contexts}),
        }

        # Collect full answer for DB storage
        full_answer = []

        try:
            if p == "openai":
                try:
                    stream = await create_openai_text_stream(api_key, model_trim, prompt)
                except APIError as e:
                    yield {
                        "event": "error",
                        "data": json.dumps({"type": "error", "message": str(e)}),
                    }
                    return

                async for token in stream:
                    full_answer.append(token)
                    yield {
                        "event": "token",
                        "data": json.dumps({"type": "token", "content": token}),
                    }
            else:
                # Gemini sync generator — stream incrementally via a queue
                queue: asyncio.Queue[str | None] = asyncio.Queue()

                def _gemini_producer():
                    try:
                        for tok in gemini_text_stream(api_key, model_trim, prompt):
                            queue.put_nowait(tok)
                    finally:
                        queue.put_nowait(None)

                asyncio.get_event_loop().run_in_executor(None, _gemini_producer)

                while True:
                    token = await queue.get()
                    if token is None:
                        break
                    full_answer.append(token)
                    yield {
                        "event": "token",
                        "data": json.dumps({"type": "token", "content": token}),
                    }
        except Exception as e:
            logger.exception("Stream error")
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "message": str(e)}),
            }
            return

        # Save assistant message
        answer_text = "".join(full_answer)
        try:
            await execute(
                "INSERT INTO messages (id, conversation_id, role, content, sources_json) VALUES (?, ?, 'assistant', ?, ?)",
                (assistant_msg_id, conversation_id, answer_text, json.dumps(contexts)),
            )
            await execute(
                "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
                (conversation_id,),
            )
        except Exception:
            logger.exception("Failed to save assistant message")

        # Done event
        yield {
            "event": "done",
            "data": json.dumps({
                "type": "done",
                "conversation_id": conversation_id,
                "message_id": assistant_msg_id,
            }),
        }

    return EventSourceResponse(event_generator())
