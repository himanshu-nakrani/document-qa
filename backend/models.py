"""Pydantic request / response models."""

from pydantic import BaseModel, Field
from typing import Literal


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: str
    filename: str
    provider: str
    embedding_model: str
    chunk_count: int
    file_size: int
    status: str  # processing | ready | error
    error_message: str | None = None
    created_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    provider: Literal["openai", "gemini"]
    model: str = Field(max_length=128)
    document_id: str
    question: str = Field(min_length=1)
    conversation_id: str | None = None


# SSE event types
class TokenEvent(BaseModel):
    type: Literal["token"] = "token"
    content: str


class SourcesEvent(BaseModel):
    type: Literal["sources"] = "sources"
    chunks: list[str]


class DoneEvent(BaseModel):
    type: Literal["done"] = "done"
    conversation_id: str
    message_id: str


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    message: str


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: list[str] | None = None
    created_at: str


class ConversationResponse(BaseModel):
    id: str
    document_id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[MessageResponse] = []


class ConversationListItem(BaseModel):
    id: str
    document_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class ConversationListResponse(BaseModel):
    conversations: list[ConversationListItem]
