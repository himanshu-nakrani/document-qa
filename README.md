# Document QA — Enterprise RAG Platform

A production-ready **Next.js** frontend and **FastAPI** backend for **retrieval-augmented generation (RAG)**. 
Upload **PDF**, **Markdown**, **Word** (.docx), or **plain text** files to index them into a vector database, then ask questions with **OpenAI** or **Google Gemini** using real-time streaming and source citations.

The UI features a stunning, high-end "Deep Zinc" aesthetic inspired by modern SaaS platforms like Vercel and Linear.

## Features

- **Multi-Model Support**: Native integrations for both **OpenAI** and **Google Gemini** (chat and embeddings).
- **Hybrid Database Architecture**: 
  - **Local Development**: Utilizes `SQLite` for relational data and local `NumPy` files (`.npz`) for fast vector storage.
  - **Production Deployment**: Dynamically switches to **PostgreSQL** with **pgvector** (e.g., Supabase) when `DATABASE_URL` is detected.
- **Advanced RAG Pipeline**: Asynchronous ingestion, intelligent chunking (with overlap), and highly scalable vector cosine similarity search.
- **Real-Time Streaming**: Uses Server-Sent Events (SSE) to stream tokens instantly to the UI, alongside an array of source document citations.
- **Conversation State**: Fully persists chat histories and contexts so users can seamlessly swap between active documents and chats.
- **Premium UI/UX**: Built with Tailwind CSS v4, featuring glassmorphism, responsive micro-animations, Markdown rendering natively (with syntax highlighting), and a responsive sidebar structure.

## Architecture

- **Frontend**: Next.js 15+ deployed on **Vercel**. Communicates with the backend using the `NEXT_PUBLIC_API_URL` environment variable.
- **Backend**: FastAPI (Python 3.14+) deployed on **Heroku**.
- **Database**: 
  - Local: `data/ragapp.db` and `data/vectors/`
  - Production: **Supabase** (PostgreSQL + pgvector enabled)
  
## Setup & Installation

### Local Development

**1. Start the FastAPI Backend**
```bash
# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies (including psycopg for postgres support)
pip install -r backend/requirements.txt

# Run the server on port 8000
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
*Note: If no `DATABASE_URL` is provided, the backend will automatically fallback to SQLite and local `.npz` storage.*

**2. Start the Next.js Frontend**
```bash
# Install node dependencies
npm install

# Start the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application. The frontend automatically rewrites `/api/*` to `http://127.0.0.1:8000` locally.

### Production Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | FastAPI | Connection string to PostgreSQL containing `pgvector` (e.g., Supabase IPv4 Pooler URL). |
| `CORS_ORIGINS` | FastAPI | Must be set to your Vercel frontend URL (e.g., `https://myapp.vercel.app`) |
| `NEXT_PUBLIC_API_URL` | Next.js | Must be set to your Heroku backend URL (e.g., `https://myapp.herokuapp.com`) |

*API Keys (OpenAI & Gemini) and Model strings are gracefully configured by the user via the robust Settings panel in the UI, keeping your server secure from hardcoded secrets!*

## API Endpoints (v2)

- `GET /api/documents` — Lists all indexed documents.
- `DELETE /api/documents/{doc_id}` — Deletes documents and their associated vector records.
- `GET /api/documents/{doc_id}/conversations` — Lists saved conversations for a document.
- `GET /api/conversations/{conv_id}` — Gets full chat history for a session.
- `POST /api/ingest` — `multipart/form-data`: parses PDF/MD/TXT/CSV, chunks it, embeds with selected provider, and stores it vectorially. 
- `POST /api/chat/stream` — `application/json`: Streams JSON-encoded Server-Sent Events (`token`, `sources`, `done`, `error`) via FastAPI streaming responses.

## License
MIT
