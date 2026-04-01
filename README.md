# Document RAG

A **Next.js** UI and **FastAPI** backend for **retrieval-augmented generation**: index **PDF**, **Markdown**, or **plain text** into a server-side vector index, then ask questions with **OpenAI** or **Google Gemini** (streaming answers).

The previous Streamlit prototype lives under [`legacy/`](legacy/).

## How it works

1. **Index** (`POST /api/ingest`): extract text (including from PDF via `pypdf`), split into overlapping chunks, embed each chunk with your chosen provider embedding model, and save vectors plus text under `VECTOR_STORE_DIRECTORY` (default `data/vectors/`, one `.npz` per document). Document metadata is stored in `DOCUMENT_REGISTRY_PATH` (default `data/documents.json`).
2. **Ask** (`POST /api/chat`): embed the question, retrieve the top **K** chunks by cosine similarity, build a RAG prompt, and stream the chat model response.

Embeddings live on disk next to the API process (not in the browser). For Docker, mount a volume on `/app/data` if you need persistence across container restarts.

## Architecture

- **Frontend**: Next.js; calls `/api/ingest` and `/api/chat` (or a full `NEXT_PUBLIC_API_URL`).
- **Backend**: FastAPI.
- **Local dev**: Next rewrites `/api/*` to `BACKEND_URL` (default `http://127.0.0.1:8000`) so you can use same-origin `fetch` without CORS.

## Requirements

- Node.js 20+ (see `package.json` `engines`)
- Python 3.12+ recommended (3.14+ works; we use NumPy vector storage instead of Chroma for broad Python support)
- npm

## Local development

**1. Python virtual environment and FastAPI**

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**2. Next.js** (separate terminal)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000): index a file, then ask questions.

Optional: copy [`.env.example`](.env.example) to `.env.local` for Next (`BACKEND_URL`, `NEXT_PUBLIC_API_URL`) and use a `.env` in the repo root for FastAPI.

## Configuration

| Variable | Service | Purpose |
|----------|---------|---------|
| `MAX_DOCUMENT_BYTES` | FastAPI | Max upload size (default ~2 MiB) |
| `MAX_CHUNKS` | FastAPI | Max chunks per document (default `800`) |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | FastAPI | Chunking (defaults `1200` / `200`) |
| `RAG_TOP_K` | FastAPI | Chunks retrieved per question (default `5`) |
| `VECTOR_STORE_DIRECTORY` | FastAPI | Where `.npz` vector files are stored |
| `DOCUMENT_REGISTRY_PATH` | FastAPI | JSON registry of indexed documents |
| `CORS_ORIGINS` | FastAPI | Origins when the browser calls the API directly |
| `BACKEND_URL` | Next | Target for `/api/*` rewrites |
| `NEXT_PUBLIC_API_URL` | Next | If set, UI calls this API base instead of same-origin |

Chat and embedding model ids are set in the UI.

## Production build (frontend only)

```bash
npm run build
npm start
```

You still need FastAPI running and compatible `BACKEND_URL` for rewrites.

## Docker Compose

```bash
docker compose up --build
```

The web image is built with `BACKEND_URL=http://api:8000`. The API service can persist `data/` via a named volume (see `docker-compose.yml`).

## API (FastAPI)

- `POST /api/ingest` — `multipart/form-data`: `provider`, `file` (`.pdf` / `.txt` / `.md`), optional `embedding_model`. Header `Authorization: Bearer <api_key>`. Returns JSON: `document_id`, `chunks`, `embedding_model`.
- `POST /api/chat` — `multipart/form-data`: `provider`, `model` (chat), `document_id`, `question`. Header `Authorization: Bearer <api_key>`. Response: streamed `text/plain`.

## Lint

```bash
npm run lint
```

## Security note

API keys are sent to your FastAPI server and forwarded to OpenAI or Google; they are not written to disk. Vector files store **only** chunk text and embeddings—not your keys. For shared deployments, prefer server-side keys and auth.
