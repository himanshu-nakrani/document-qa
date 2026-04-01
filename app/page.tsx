"use client";

import { useCallback, useState } from "react";

type Provider = "openai" | "gemini";

const DEFAULT_MODEL: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
};

export default function Home() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState(DEFAULT_MODEL.openai);
  const [apiKey, setApiKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  const canAsk = Boolean(
    apiKey.trim() && model.trim() && file && question.trim() && !streaming,
  );

  const onProviderChange = (next: Provider) => {
    setProvider(next);
    setModel(DEFAULT_MODEL[next]);
  };

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !apiKey.trim() || !model.trim() || !question.trim()) return;

      setError(null);
      setAnswer("");
      setStreaming(true);

      const formData = new FormData();
      formData.append("provider", provider);
      formData.append("model", model.trim());
      formData.append("file", file);
      formData.append("question", question.trim());

      try {
        const res = await fetch("/api/chat", {
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
            const data = (await res.json()) as { error?: string };
            if (data.error) message = data.error;
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
    [apiKey, file, model, provider, question],
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Document question answering
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Upload a document and ask a question — the model answers using the
            file content.             Choose{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              OpenAI
            </span>{" "}
            or{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Google Gemini
            </span>
            , then
            paste an API key and model id. Keys are sent to this app&apos;s
            server only to call the provider (not stored). Avoid shared machines
            for production keys. Get keys from{" "}
            <a
              className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
              href="https://platform.openai.com/account/api-keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAI
            </a>{" "}
            or{" "}
            <a
              className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
            .
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Provider
            <select
              value={provider}
              onChange={(e) =>
                onProviderChange(e.target.value as Provider)
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Model
            <input
              type="text"
              autoComplete="off"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "openai" ? "e.g. gpt-4o-mini" : "e.g. gemini-2.0-flash"
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              Use the exact model id from the provider&apos;s docs (e.g. chat
              models for OpenAI, Gemini model names for Google).
            </span>
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
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>

          {(!apiKey.trim() || !model.trim()) && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              Add your API key and model id to continue.
            </p>
          )}

          <label className="flex flex-col gap-2 text-sm font-medium">
            Document (.txt or .md)
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              disabled={!apiKey.trim() || !model.trim()}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setAnswer("");
                setError(null);
              }}
              className="text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-300 dark:file:bg-zinc-700 dark:file:text-zinc-100 dark:hover:file:bg-zinc-600"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Question
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Can you give me a short summary?"
              disabled={!file || !apiKey.trim() || !model.trim()}
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
