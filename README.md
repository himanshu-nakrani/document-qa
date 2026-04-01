# Document question answering

A Next.js app that answers questions about an uploaded `.txt` or `.md` document using OpenAI or Google Gemini (you choose in the UI, with your own API key and model id). Answers stream in as they are generated.

The previous Streamlit prototype lives under [`legacy/`](legacy/).

## Security note

The UI asks for a provider (OpenAI or Gemini), model id, and API key. The key is sent to **this app’s server** in the `Authorization` header and forwarded to the chosen provider; it is not written to disk. Do not use a production key on shared or untrusted machines. For team or public deployments, prefer server-side keys only — that would be a follow-up change to `/api/chat`.

## Requirements

- Node.js 20+ (see `package.json` `engines`)
- npm

## Local development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Copy [`.env.example`](.env.example) to `.env.local` if you need server-side settings:

- `MAX_DOCUMENT_BYTES` — maximum upload size in bytes (default: `2097152`)

Model ids are entered in the UI (not via env).

## Production build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t document-qa .
docker run --rm -p 3000:3000 document-qa
```

Optional env vars (e.g. `-e MAX_DOCUMENT_BYTES=2097152`) match `.env.example`.

## API

- `POST /api/chat` — `multipart/form-data` with fields `provider` (`openai` or `gemini`), `model` (string), `file` (`.txt` / `.md`), and `question` (string). Header `Authorization: Bearer <api_key>`. Response body is streamed `text/plain` token text.

## Lint

```bash
npm run lint
```
