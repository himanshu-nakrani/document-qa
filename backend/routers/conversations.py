"""Conversation management endpoints."""

import json
import logging
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from typing import Annotated

from backend.database import execute, fetch_all, fetch_one
from backend.models import (
    ConversationListItem,
    ConversationListResponse,
    ConversationResponse,
    MessageResponse,
)

logger = logging.getLogger("ragapp")
router = APIRouter()


def _extract_key(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    key = authorization.removeprefix("Bearer ").strip()
    return key or None


@router.get("/conversations")
async def list_conversations(
    document_id: str | None = None,
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    if document_id:
        rows = await fetch_all(
            "SELECT c.id, c.document_id, c.title, c.created_at, c.updated_at, "
            "(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count "
            "FROM conversations c WHERE c.document_id = ? ORDER BY c.updated_at DESC",
            (document_id,),
        )
    else:
        rows = await fetch_all(
            "SELECT c.id, c.document_id, c.title, c.created_at, c.updated_at, "
            "(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count "
            "FROM conversations c ORDER BY c.updated_at DESC"
        )

    items = [ConversationListItem(**r) for r in rows]
    return ConversationListResponse(conversations=items)


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    conv = await fetch_one(
        "SELECT id, document_id, title, created_at, updated_at FROM conversations WHERE id = ?",
        (conversation_id,),
    )
    if not conv:
        return JSONResponse(status_code=404, content={"error": "Conversation not found."})

    msg_rows = await fetch_all(
        "SELECT id, role, content, sources_json, created_at FROM messages "
        "WHERE conversation_id = ? ORDER BY created_at ASC",
        (conversation_id,),
    )
    messages = []
    for m in msg_rows:
        sources = None
        if m.get("sources_json"):
            try:
                sources = json.loads(m["sources_json"])
            except (json.JSONDecodeError, TypeError):
                pass
        messages.append(
            MessageResponse(
                id=m["id"],
                role=m["role"],
                content=m["content"],
                sources=sources,
                created_at=m["created_at"],
            )
        )

    return ConversationResponse(
        id=conv["id"],
        document_id=conv["document_id"],
        title=conv["title"],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
        messages=messages,
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    conv = await fetch_one("SELECT id FROM conversations WHERE id = ?", (conversation_id,))
    if not conv:
        return JSONResponse(status_code=404, content={"error": "Conversation not found."})

    await execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    return {"status": "deleted", "conversation_id": conversation_id}
