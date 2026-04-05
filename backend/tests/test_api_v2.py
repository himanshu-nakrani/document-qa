import pytest
from httpx import AsyncClient, ASGITransport
import io
import json
from unittest.mock import patch, MagicMock, AsyncMock

# Basic test to ensure endpoints are reachable and return expected structures
# We mock external services (OpenAI/Gemini) to avoid API dependency

@pytest.mark.asyncio
async def test_ingest_document(async_client: AsyncClient):
    # Mocking the embedding service
    with patch("backend.routers.ingest.embed_texts_openai", new_callable=AsyncMock) as mock_embed:
        mock_embed.return_value = [[0.1] * 1536] # Mocked 1536-dim embedding
        
        file_content = b"This is a test document content for ingestion."
        file = ("test.txt", file_content, "text/plain")
        
        response = await async_client.post(
            "/api/ingest",
            data={"provider": "openai", "embedding_model": "text-embedding-3-small"},
            files={"file": file},
            headers={"Authorization": "Bearer test-key"}
        )
        
        assert response.status_code == 202
        data = response.json()
        assert "document_id" in data
        assert data["status"] == "processing"
        
        doc_id = data["document_id"]
        
        # Check if document appears in list
        response = await async_client.get("/api/documents", headers={"Authorization": "Bearer test-key"})
        assert response.status_code == 200
        docs = response.json()["documents"]
        assert any(d["id"] == doc_id for d in docs)

@pytest.mark.asyncio
async def test_full_workflow(async_client: AsyncClient):
    # 1. Ingest
    with patch("backend.routers.ingest.embed_texts_openai", new_callable=AsyncMock) as mock_embed_ingest:
        mock_embed_ingest.return_value = [[0.1] * 1536]
        
        file_content = b"The capital of France is Paris."
        file = ("paris.txt", file_content, "text/plain")
        
        resp = await async_client.post(
            "/api/ingest",
            data={"provider": "openai"},
            files={"file": file},
            headers={"Authorization": "Bearer test-key"}
        )
        doc_id = resp.json()["document_id"]
        
        # Wait a bit for background task (since it's a mock it should be fast, but we need to ensure it's done)
        # Actually in tests we should probably wait for the status to be 'ready'
        import asyncio
        for _ in range(10):
            status_resp = await async_client.get(f"/api/documents/{doc_id}/status", headers={"Authorization": "Bearer test-key"})
            if status_resp.json()["status"] == "ready":
                break
            await asyncio.sleep(0.1)
        
        assert status_resp.json()["status"] == "ready"

    # 2. Chat
    with patch("backend.routers.chat.embed_query_openai", new_callable=AsyncMock) as mock_embed_query, \
         patch("backend.routers.chat.create_openai_text_stream") as mock_chat_stream:
        
        mock_embed_query.return_value = [0.1] * 1536
        
        # Mocking an async generator for the stream
        async def mock_stream(*args, **kwargs):
            yield "Paris "
            yield "is "
            yield "the "
            yield "capital."
            
        mock_chat_stream.return_value = mock_stream()
        
        chat_payload = {
            "provider": "openai",
            "model": "gpt-3.5-turbo",
            "question": "What is the capital of France?",
            "document_id": doc_id
        }
        
        # SSE request
        response = await async_client.post(
            "/api/chat",
            json=chat_payload,
            headers={"Authorization": "Bearer test-key"}
        )
        
        assert response.status_code == 200
        # Check if we get events
        # SSE format: event: name\ndata: content\n\n
        content = response.text
        # Normalize line endings
        content = content.replace("\r\n", "\n")
        events = [e.strip() for e in content.split("\n\n") if e.strip()]
        
        assert any("event: sources" in e for e in events), f"Sources event missing. Events: {events}"
        assert any("event: token" in e for e in events), f"Token event missing. Events: {events}"
        assert any("event: done" in e for e in events), f"Done event missing. Events: {events}"
        
        # Parse the 'done' event to get conversation_id
        done_event = [e for e in events if "event: done" in e][0]
        data_line = [line for line in done_event.splitlines() if line.startswith("data:")][0]
        done_json_str = data_line.replace("data:", "", 1).strip()
        done_data = json.loads(done_json_str)
        assert "conversation_id" in done_data, f"conversation_id missing in {done_data}"
        conv_id = done_data["conversation_id"]
        
        # 3. List Conversations
        conv_resp = await async_client.get("/api/conversations", headers={"Authorization": "Bearer test-key"})
        assert conv_resp.status_code == 200
        conversations = conv_resp.json()["conversations"]
        assert any(c["id"] == conv_id for c in conversations)

        # 4. Get Conversation Details
        detail_resp = await async_client.get(f"/api/conversations/{conv_id}", headers={"Authorization": "Bearer test-key"})
        assert detail_resp.status_code == 200
        messages = detail_resp.json()["messages"]
        assert len(messages) >= 2 # User + AI

        # 5. Delete Conversation
        del_conv = await async_client.delete(f"/api/conversations/{conv_id}", headers={"Authorization": "Bearer test-key"})
        assert del_conv.status_code == 200
        
        # 6. Delete Document
        del_doc = await async_client.delete(f"/api/documents/{doc_id}", headers={"Authorization": "Bearer test-key"})
        assert del_doc.status_code == 200

@pytest.mark.asyncio
async def test_health_and_ready(async_client: AsyncClient):
    resp = await async_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
    
    resp = await async_client.get("/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ready"}

@pytest.mark.asyncio
async def test_document_detail_and_not_found(async_client: AsyncClient):
    # Test document detail with non-existent id
    resp = await async_client.get("/api/documents/non-existent-uuid", headers={"Authorization": "Bearer test-key"})
    assert resp.status_code == 404
    assert "error" in resp.json()
    
    # Test auth missing
    resp = await async_client.get("/api/documents")
    assert resp.status_code == 401
