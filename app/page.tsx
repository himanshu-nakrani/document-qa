"use client";

import { useCallback, useState } from "react";

type Provider = "openai" | "gemini";

const DEFAULT_CHAT: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
};

const DEFAULT_EMBEDDING: Record<Provider, string> = {
  openai: "text-embedding-3-small",
  gemini: "models/text-embedding-004",
};

export default function Home() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState(DEFAULT_CHAT.openai);
  const [embeddingModel, setEmbeddingModel] = useState(
    DEFAULT_EMBEDDING.openai,
  );
  const [apiKey, setApiKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [indexing, setIndexing] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const ingestUrl = apiBase ? `${apiBase}/api/ingest` : "/api/ingest";
  const chatUrl = apiBase ? `${apiBase}/api/chat` : "/api/chat";

  const onProviderChange = (next: Provider) => {
    setProvider(next);
    setModel(DEFAULT_CHAT[next]);
    setEmbeddingModel(DEFAULT_EMBEDDING[next]);
    setDocumentId(null);
    setChunkCount(null);
    setAnswer("");
  };

  const onIndex = useCallback(async () => {
    if (!file || !apiKey.trim() || !embeddingModel.trim()) return;
    setError(null);
    setIndexing(true);
    setDocumentId(null);
    setChunkCount(null);
    setAnswer("");

    const formData = new FormData();
    formData.append("provider", provider);
    formData.append("embedding_model", embeddingModel.trim());
    formData.append("file", file);

    try {
      const res = await fetch(ingestUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        document_id?: string;
        chunks?: number;
      };

      if (!res.ok) {
        setError(data.error ?? `Indexing failed (${res.status})`);
        return;
      }

      if (data.document_id) {
        setDocumentId(data.document_id);
        setChunkCount(typeof data.chunks === "number" ? data.chunks : null);
      }
    } catch {
      setError("Network error while indexing.");
    } finally {
      setIndexing(false);
    }
  }, [apiKey, embeddingModel, file, ingestUrl, provider]);

  const onAsk = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !documentId ||
        !apiKey.trim() ||
        !model.trim() ||
        !question.trim()
      )
        return;

      setError(null);
      setAnswer("");
      setStreaming(true);

      const formData = new FormData();
      formData.append("provider", provider);
      formData.append("model", model.trim());
      formData.append("document_id", documentId);
      formData.append("question", question.trim());

      try {
        const res = await fetch(chatUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: formData,
        });

        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("application/json")) {
            const errBody = (await res.json()) as { error?: string };
            if (errBody.error) message = errBody.error;
          }
          setError(message);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response body.");
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setAnswer(accumulated);
        }
      } catch {
        setError("Network error or stream interrupted.");
      } finally {
        setStreaming(false);
      }
    },
    [apiKey, chatUrl, documentId, model, provider, question],
  );

  const canIndex = Boolean(
    apiKey.trim() && embeddingModel.trim() && file && !indexing,
  );
  const canAsk = Boolean(
    documentId &&
      apiKey.trim() &&
      model.trim() &&
      question.trim() &&
      !streaming,
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Document RAG
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            End-to-end RAG: index a PDF or text file into a local vector index on
            the server, then ask questions. Retrieval uses embeddings from{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              OpenAI
            </span>{" "}
            or{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Gemini
            </span>
            ; answers are streamed from your chosen chat model. API keys go to
            your FastAPI backend only (not stored in the browser).
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            1. Provider and models
          </h2>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Provider
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as Provider)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Embedding model (for indexing and retrieval)
            <input
              type="text"
              autoComplete="off"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Chat model (for answers)
            <input
              type="text"
              autoComplete="off"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "openai" ? "e.g. gpt-4o-mini" : "e.g. gemini-2.0-flash"
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            API key
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === "openai" ? "sk-…" : "Google AI API key"
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            2. Index document
          </h2>
          <label className="flex flex-col gap-2 text-sm font-medium">
            File (.pdf, .txt, .md)
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              disabled={!apiKey.trim() || !embeddingModel.trim()}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setDocumentId(null);
                setChunkCount(null);
                setAnswer("");
                setError(null);
              }}
              className="text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-300 dark:file:bg-zinc-700 dark:file:text-zinc-100 dark:hover:file:bg-zinc-600"
            />
          </label>
          <button
            type="button"
            disabled={!canIndex}
            onClick={onIndex}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {indexing ? "Indexing…" : "Index document"}
          </button>
          {documentId && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Indexed.{" "}
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {documentId}
              </span>
              {chunkCount != null ? ` · ${chunkCount} chunks` : null}
            </p>
          )}
        </section>

        <form onSubmit={onAsk} className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            3. Ask a question
          </h2>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Question
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What are the main conclusions?"
              disabled={!documentId || !apiKey.trim() || !model.trim()}
              rows={4}
              className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>

          <button
            type="submit"
            disabled={!canAsk}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {streaming ? "Answering…" : "Ask"}
          </button>
        </form>

        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {(answer || streaming) && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Answer
            </h2>
            <div className="min-h-[4rem] whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {answer}
              {streaming && (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-zinc-400 align-middle dark:bg-zinc-500" />
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
