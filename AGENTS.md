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

### Hello world verification

Without a real API key you can still verify the full stack is wired up:

```bash
# Creates a test file, uploads via the Next.js proxy → FastAPI, reaches OpenAI, gets expected auth error
echo "test content" > /tmp/test.txt
curl -s -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer fake-key" \
  -F "provider=openai" \
  -F "file=@/tmp/test.txt;filename=test.txt"
# Expected: 502 with "Incorrect API key provided" from OpenAI (proves full pipeline runs)
```

### Gotchas

- `python3.12-venv` must be installed at the system level (`sudo apt-get install -y python3.12-venv`) before creating the venv. The VM image may not include it by default.
- The app requires an **OpenAI** or **Google Gemini** API key entered at runtime in the UI. No server-side environment variable is needed for the key; it is passed per-request via `Authorization: Bearer` header. Without a key, you can still test the full stack connectivity (auth validation, file processing, chunking) — the request will fail at the external embedding API call, which confirms everything upstream works.
- Python dependencies go in `backend/requirements.txt`; Node dependencies in the root `package.json`.
