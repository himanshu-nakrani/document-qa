"""NumPy-backed vector storage (one file per document). Works without ChromaDB."""

from pathlib import Path

import numpy as np

from backend.settings import settings


def _doc_path(document_id: str) -> Path:
    base = Path(settings.vector_store_directory)
    base.mkdir(parents=True, exist_ok=True)
    safe = "".join(c for c in document_id if c.isalnum() or c in "-_")
    if not safe:
        raise ValueError("Invalid document id.")
    return base / f"{safe}.npz"


def add_chunks(
    document_id: str,
    chunk_texts: list[str],
    embeddings: list[list[float]],
) -> None:
    if len(chunk_texts) != len(embeddings):
        raise ValueError("Chunks and embeddings length mismatch.")
    if not chunk_texts:
        raise ValueError("No chunks to index.")
    path = _doc_path(document_id)
    E = np.asarray(embeddings, dtype=np.float32)
    if E.ndim != 2:
        raise ValueError("Embeddings must be a 2D array.")
    texts = np.asarray(chunk_texts, dtype=object)
    np.savez_compressed(path, embeddings=E, texts=texts)


def query_similar(
    document_id: str,
    query_embedding: list[float],
    top_k: int,
) -> list[str]:
    path = _doc_path(document_id)
    if not path.is_file():
        raise FileNotFoundError("Vector index file not found.")
    data = np.load(path, allow_pickle=True)
    E = data["embeddings"]
    texts = data["texts"]
    n = E.shape[0]
    if n == 0:
        return []
    q = np.asarray(query_embedding, dtype=np.float32)
    qn = q / (np.linalg.norm(q) + 1e-9)
    En = E / (np.linalg.norm(E, axis=1, keepdims=True) + 1e-9)
    sims = En @ qn
    k = min(top_k, n)
    idx = np.argsort(-sims)[:k]
    return [str(texts[i]) for i in idx]


def delete_collection(document_id: str) -> None:
    path = _doc_path(document_id)
    try:
        path.unlink()
    except OSError:
        pass
