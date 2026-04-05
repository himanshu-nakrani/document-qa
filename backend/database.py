"""Database layer for documents, conversations, and messages.
Supports both PostgreSQL (psycopg) and SQLite (aiosqlite) based on settings.
"""

import aiosqlite
import psycopg
from psycopg.rows import dict_row
import os
from pathlib import Path
from typing import Any, Protocol, runtime_checkable
from backend.settings import settings

@runtime_checkable
class AsyncConnection(Protocol):
    async def execute(self, query: str, params: tuple = ()) -> Any: ...
    async def commit(self) -> None: ...
    async def close(self) -> None: ...

_db: Any = None
_is_postgres: bool = False

# SQL Dialect differences
DATETIME_DEFAULT = "(datetime('now'))" if not settings.database_url else "NOW()"
TEXT_SERIAL = "TEXT" if not settings.database_url else "TEXT" # UUIDs handled as strings

SCHEMA_SQL = f"""
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    provider TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    file_size INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT {DATETIME_DEFAULT}
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TIMESTAMP NOT NULL DEFAULT {DATETIME_DEFAULT},
    updated_at TIMESTAMP NOT NULL DEFAULT {DATETIME_DEFAULT},
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT {DATETIME_DEFAULT},
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_document ON conversations(document_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
"""

async def init_db() -> None:
    global _db, _is_postgres
    if settings.database_url:
        # PostgreSQL
        _db = await psycopg.AsyncConnection.connect(
            settings.database_url,
            row_factory=dict_row,
            autocommit=True
        )
        _is_postgres = True
        # Initialize schema
        await _db.execute(SCHEMA_SQL)
    else:
        # SQLite
        p = Path(settings.database_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        _db = await aiosqlite.connect(str(p))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        await _db.executescript(SCHEMA_SQL)
        await _db.commit()
        _is_postgres = False

async def get_db():
    global _db
    if _db is None:
        await init_db()
    return _db

async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None

async def fetch_one(query: str, params: tuple = ()) -> dict[str, Any] | None:
    db = await get_db()
    if _is_postgres:
        async with db.cursor() as cur:
            await cur.execute(query.replace('?', '%s'), params)
            return await cur.fetchone()
    else:
        cursor = await db.execute(query, params)
        row = await cursor.fetchone()
        return dict(row) if row else None

async def fetch_all(query: str, params: tuple = ()) -> list[dict[str, Any]]:
    db = await get_db()
    if _is_postgres:
        async with db.cursor() as cur:
            await cur.execute(query.replace('?', '%s'), params)
            return await cur.fetchall()
    else:
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

async def execute(query: str, params: tuple = ()) -> None:
    db = await get_db()
    if _is_postgres:
        async with db.cursor() as cur:
            await cur.execute(query.replace('?', '%s'), params)
    else:
        await db.execute(query, params)
        await db.commit()
