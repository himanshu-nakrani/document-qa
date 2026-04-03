"""Document management endpoints: list, get, delete."""

import logging
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from typing import Annotated

from backend.database import execute, fetch_all, fetch_one
from backend.models import DocumentListResponse, DocumentResponse
from backend.services import vectorstore

logger = logging.getLogger("ragapp")
router = APIRouter()


def _extract_key(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    key = authorization.removeprefix("Bearer ").strip()
    return key or None


@router.get("/documents")
async def list_documents(
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    rows = await fetch_all(
        "SELECT id, filename, provider, embedding_model, chunk_count, file_size, status, error_message, created_at "
        "FROM documents ORDER BY created_at DESC"
    )
    docs = [DocumentResponse(**r) for r in rows]
    return DocumentListResponse(documents=docs)


@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    row = await fetch_one("SELECT * FROM documents WHERE id = ?", (document_id,))
    if not row:
        return JSONResponse(status_code=404, content={"error": "Document not found."})
    return DocumentResponse(**row)


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    row = await fetch_one("SELECT id FROM documents WHERE id = ?", (document_id,))
    if not row:
        return JSONResponse(status_code=404, content={"error": "Document not found."})

    # Delete vector file
    try:
        vectorstore.delete_collection(document_id)
    except Exception:
        logger.warning("Failed to delete vector file for %s", document_id)

    # Cascade deletes conversations + messages
    await execute("DELETE FROM documents WHERE id = ?", (document_id,))
    return {"status": "deleted", "document_id": document_id}


@router.get("/documents/{document_id}/status")
async def document_status(
    document_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    key = _extract_key(authorization)
    if not key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    row = await fetch_one(
        "SELECT id, status, error_message, chunk_count FROM documents WHERE id = ?",
        (document_id,),
    )
    if not row:
        return JSONResponse(status_code=404, content={"error": "Document not found."})
    return row
