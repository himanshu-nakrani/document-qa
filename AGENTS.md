# AGENTS.md

## Cursor Cloud specific instructions

This is a **Document RAG** application with two services: a **Next.js 16** frontend and a **FastAPI** backend.

### Services

| Service | Command | Port |
|---------|---------|------|
| FastAPI backend | `.venv/bin/uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000` | 8000 |
| Next.js frontend | `npm run dev` | 3000 |

Start the backend **before** the frontend. The Next.js dev server proxies `/api/*` requests to `http://127.0.0.1:8000` via rewrites in `next.config.ts`.

### Lint / Build / Test

See `package.json` scripts. Key commands:
- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **No automated test suite** exists in this repo.

### Gotchas

- `python3.12-venv` must be installed at the system level (`sudo apt-get install -y python3.12-venv`) before creating the venv. The VM image may not include it by default.
- The app requires an **OpenAI** or **Google Gemini** API key entered at runtime in the UI. No server-side environment variable is needed for the key; it is passed per-request via `Authorization: Bearer` header.
- Python dependencies go in `backend/requirements.txt`; Node dependencies in the root `package.json`.
