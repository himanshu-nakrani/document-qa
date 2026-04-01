import asyncio
from typing import Annotated

from fastapi import APIRouter, Form, Header
from fastapi.responses import JSONResponse, StreamingResponse
from openai import APIError

from backend.services.embeddings import (
    embed_query_gemini_sync,
    embed_query_openai,
)
from backend.services.llm import (
    build_rag_prompt,
    create_openai_text_stream,
    gemini_text_stream,
)
from backend.services.registry import get_document
from backend.services import vectorstore
from backend.settings import settings

router = APIRouter()

MAX_MODEL_LEN = 128


def _parse_provider(raw: str) -> str | None:
    if raw in ("openai", "gemini"):
        return raw
    return None


@router.post("/chat", response_model=None)
async def chat(
    provider: Annotated[str, Form()],
    model: Annotated[str, Form()],
    question: Annotated[str, Form()],
    document_id: Annotated[str, Form()],
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

    model_trim = model.strip()
    if not model_trim:
        return JSONResponse(status_code=400, content={"error": "Model is required."})
    if len(model_trim) > MAX_MODEL_LEN:
        return JSONResponse(
            status_code=400,
            content={"error": f"Model id is too long (max {MAX_MODEL_LEN} characters)."},
        )

    q = question.strip()
    if not q:
        return JSONResponse(status_code=400, content={"error": "Question is required."})

    doc_id = document_id.strip()
    if not doc_id:
        return JSONResponse(
            status_code=400,
            content={"error": "document_id is required (index a document first)."},
        )

    meta = get_document(settings.document_registry_path, doc_id)
    if not meta:
        return JSONResponse(
            status_code=404,
            content={"error": "Unknown document_id. Ingest the document again."},
        )

    if meta.get("provider") != p:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Provider does not match the document you indexed. Switch provider or re-index.",
            },
        )

    emb_model = str(meta.get("embedding_model") or "")
    if not emb_model:
        return JSONResponse(status_code=500, content={"error": "Corrupt document registry entry."})

    try:
        if p == "openai":
            q_emb = await embed_query_openai(api_key, emb_model, q)
        else:
            q_emb = await asyncio.to_thread(
                embed_query_gemini_sync,
                api_key,
                emb_model,
                q,
            )
    except Exception as e:  # noqa: BLE001
        return JSONResponse(
            status_code=502,
            content={"error": f"Query embedding failed: {e!s}"},
        )

    try:
        contexts = vectorstore.query_similar(
            doc_id,
            q_emb,
            top_k=settings.rag_top_k,
        )
    except Exception as e:  # noqa: BLE001
        return JSONResponse(
            status_code=404,
            content={"error": f"Could not load vector index: {e!s}"},
        )

    if not contexts:
        return JSONResponse(
            status_code=400,
            content={"error": "No matching context found. Try re-indexing the document."},
        )

    prompt = build_rag_prompt(contexts, q)

    if p == "openai":
        try:
            stream = await create_openai_text_stream(api_key, model_trim, prompt)
        except APIError as e:
            sc = getattr(e, "status_code", None)
            status = sc if sc is not None and 400 <= sc < 600 else 502
            msg = str(e) or "OpenAI request failed."
            return JSONResponse(status_code=status, content={"error": msg})
        return StreamingResponse(
            stream,
            media_type="text/plain; charset=utf-8",
            headers={"Cache-Control": "no-store"},
        )

    sync_gen = gemini_text_stream(api_key, model_trim, prompt)
    return StreamingResponse(
        sync_gen,
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )
