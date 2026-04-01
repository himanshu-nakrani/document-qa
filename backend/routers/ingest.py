import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Header, UploadFile
from fastapi.responses import JSONResponse

from backend.services.chunking import chunk_text
from backend.services.embeddings import embed_texts_gemini_sync, embed_texts_openai
from backend.services.extract import allowed_suffix, extract_text
from backend.services.registry import register_document
from backend.services import vectorstore
from backend.settings import settings

router = APIRouter()

MAX_MODEL_LEN = 128


def _parse_provider(raw: str) -> str | None:
    if raw in ("openai", "gemini"):
        return raw
    return None


@router.post("/ingest", response_model=None)
async def ingest(
    provider: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    embedding_model: str = Form(""),
    authorization: Annotated[str | None, Header()] = None,
):
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={
                "error": "Missing or invalid Authorization header (use Bearer token).",
            },
        )
    api_key = authorization.removeprefix("Bearer ").strip()
    if not api_key:
        return JSONResponse(status_code=401, content={"error": "Missing API key."})

    p = _parse_provider(provider)
    if not p:
        return JSONResponse(
            status_code=400,
            content={"error": 'Invalid or missing provider (use "openai" or "gemini").'},
        )

    if not file.filename:
        return JSONResponse(status_code=400, content={"error": "A document file is required."})

    if not allowed_suffix(file.filename):
        return JSONResponse(
            status_code=400,
            content={"error": "Only .pdf, .txt, and .md files are supported."},
        )

    emb = embedding_model.strip()
    if len(emb) > MAX_MODEL_LEN:
        return JSONResponse(
            status_code=400,
            content={"error": f"Embedding model id is too long (max {MAX_MODEL_LEN} characters)."},
        )
    if not emb:
        emb = (
            settings.default_embedding_model_openai
            if p == "openai"
            else settings.default_embedding_model_gemini
        )

    max_bytes = settings.max_document_bytes
    raw = await file.read()
    if len(raw) > max_bytes:
        return JSONResponse(
            status_code=413,
            content={"error": f"File too large (max {max_bytes} bytes)."},
        )

    try:
        text = extract_text(filename=file.filename, raw=raw)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    chunks = chunk_text(
        text,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    if not chunks:
        return JSONResponse(
            status_code=400,
            content={"error": "No text content to index after processing."},
        )

    if len(chunks) > settings.max_chunks:
        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    f"Document splits into too many chunks ({len(chunks)}). "
                    f"Maximum is {settings.max_chunks}. Try a smaller file or increase CHUNK_SIZE."
                ),
            },
        )

    document_id = str(uuid.uuid4())

    try:
        if p == "openai":
            embeddings = await embed_texts_openai(api_key, emb, chunks)
        else:
            embeddings = await asyncio.to_thread(
                embed_texts_gemini_sync,
                api_key,
                emb,
                chunks,
            )
    except Exception as e:  # noqa: BLE001
        return JSONResponse(
            status_code=502,
            content={"error": f"Embedding failed: {e!s}"},
        )

    try:
        vectorstore.add_chunks(document_id, chunks, embeddings)
    except Exception as e:  # noqa: BLE001
        return JSONResponse(
            status_code=500,
            content={"error": f"Vector store failed: {e!s}"},
        )

    register_document(
        settings.document_registry_path,
        document_id,
        provider=p,
        embedding_model=emb,
        chunk_count=len(chunks),
    )

    return JSONResponse(
        content={
            "document_id": document_id,
            "chunks": len(chunks),
            "embedding_model": emb,
        },
    )
