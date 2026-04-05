"""Vector storage service. Supports both pgvector (Supabase) and local NumPy files."""

import os
from pathlib import Path
import numpy as np
import json
import psycopg
from backend.settings import settings

# If running with Postgres, we use the 'vectors' table
# Schema: id, document_id, content, embedding (vector)

async def _get_pg_conn():
    if not settings.database_url:
        return None
    return await psycopg.AsyncConnection.connect(settings.database_url, autocommit=True)

async def add_chunks(
    document_id: str,
    chunk_texts: list[str],
    embeddings: list[list[float]],
) -> None:
    if settings.database_url:
        # PostgreSQL with pgvector
        async with await _get_pg_conn() as conn:
            async with conn.cursor() as cur:
                # Batch insert
                for text, emb in zip(chunk_texts, embeddings):
                    await cur.execute(
                        "INSERT INTO vectors (document_id, content, embedding) VALUES (%s, %s, %s)",
                        (document_id, text, emb)
                    )
    else:
        # NumPy Local Storage
        base = Path(settings.vector_store_directory)
        base.mkdir(parents=True, exist_ok=True)
        path = base / f"{document_id}.npz"
        E = np.asarray(embeddings, dtype=np.float32)
        texts = np.asarray(chunk_texts, dtype=object)
        np.savez_compressed(path, embeddings=E, texts=texts)

async def query_similar(
    document_id: str,
    query_embedding: list[float],
    top_k: int,
) -> list[str]:
    if settings.database_url:
        # PostgreSQL with pgvector (Cosine Similarity)
        async with await _get_pg_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT content 
                    FROM vectors 
                    WHERE document_id = %s 
                    ORDER BY embedding <=> %s::vector 
                    LIMIT %s
                    """,
                    (document_id, query_embedding, top_k)
                )
                rows = await cur.fetchall()
                return [r[0] for r in rows]
    else:
        # NumPy Local Storage
        path = Path(settings.vector_store_directory) / f"{document_id}.npz"
        if not path.is_file():
            return []
        data = np.load(path, allow_pickle=True)
        E = data["embeddings"]
        texts = data["texts"]
        q = np.asarray(query_embedding, dtype=np.float32)
        qn = q / (np.linalg.norm(q) + 1e-9)
        En = E / (np.linalg.norm(E, axis=1, keepdims=True) + 1e-9)
        sims = En @ qn
        idx = np.argsort(-sims)[:top_k]
        return [str(texts[i]) for i in idx]

async def delete_collection(document_id: str) -> None:
    if settings.database_url:
        async with await _get_pg_conn() as conn:
            async with conn.cursor() as cur:
                await cur.execute("DELETE FROM vectors WHERE document_id = %s", (document_id,))
    else:
        path = Path(settings.vector_store_directory) / f"{document_id}.npz"
        try:
            path.unlink()
        except OSError:
            pass
