"""Persist document metadata — now a thin compatibility layer over SQLite.

The async database module (backend.database) is the primary store.
These sync functions are kept for any legacy / migration paths.
"""

import json
import os
from pathlib import Path
from typing import Any


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def load_registry(path: str) -> dict[str, Any]:
    p = Path(path)
    if not p.is_file():
        return {}
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, dict) else {}


def save_registry(path: str, data: dict[str, Any]) -> None:
    p = Path(path)
    _ensure_parent(p)
    tmp = p.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=0)
    os.replace(tmp, p)


def register_document(
    path: str,
    document_id: str,
    *,
    provider: str,
    embedding_model: str,
    chunk_count: int,
) -> None:
    reg = load_registry(path)
    reg[document_id] = {
        "provider": provider,
        "embedding_model": embedding_model,
        "chunk_count": chunk_count,
    }
    save_registry(path, reg)


def get_document(path: str, document_id: str) -> dict[str, Any] | None:
    reg = load_registry(path)
    entry = reg.get(document_id)
    return entry if isinstance(entry, dict) else None


def unregister_document(path: str, document_id: str) -> None:
    reg = load_registry(path)
    if document_id in reg:
        del reg[document_id]
        save_registry(path, reg)
