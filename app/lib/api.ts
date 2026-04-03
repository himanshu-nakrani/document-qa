/**
 * Typed API client for the Document RAG backend.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = "openai" | "gemini";

export interface DocumentInfo {
  id: string;
  filename: string;
  provider: string;
  embedding_model: string;
  chunk_count: number;
  file_size: number;
  status: "processing" | "ready" | "error";
  error_message?: string | null;
  created_at: string;
}

export interface ConversationListItem {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

// ---------------------------------------------------------------------------
// API base
// ---------------------------------------------------------------------------

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function url(path: string): string {
  return apiBase ? `${apiBase}${path}` : path;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function listDocuments(apiKey: string): Promise<DocumentInfo[]> {
  const res = await fetch(url("/api/documents"), {
    headers: authHeaders(apiKey),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  return data.documents ?? [];
}

export async function getDocumentStatus(
  apiKey: string,
  documentId: string
): Promise<{ status: string; chunk_count: number; error_message?: string }> {
  const res = await fetch(url(`/api/documents/${documentId}/status`), {
    headers: authHeaders(apiKey),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deleteDocument(
  apiKey: string,
  documentId: string
): Promise<void> {
  const res = await fetch(url(`/api/documents/${documentId}`), {
    method: "DELETE",
    headers: authHeaders(apiKey),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function ingestDocument(
  apiKey: string,
  provider: Provider,
  file: File,
  embeddingModel: string
): Promise<{ document_id: string; status: string; embedding_model: string }> {
  const formData = new FormData();
  formData.append("provider", provider);
  formData.append("embedding_model", embeddingModel);
  formData.append("file", file);

  const res = await fetch(url("/api/ingest"), {
    method: "POST",
    headers: authHeaders(apiKey),
    body: formData,
  });

  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function listConversations(
  apiKey: string,
  documentId?: string
): Promise<ConversationListItem[]> {
  const q = documentId ? `?document_id=${documentId}` : "";
  const res = await fetch(url(`/api/conversations${q}`), {
    headers: authHeaders(apiKey),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  return data.conversations ?? [];
}

export async function getConversation(
  apiKey: string,
  conversationId: string
): Promise<Conversation> {
  const res = await fetch(url(`/api/conversations/${conversationId}`), {
    headers: authHeaders(apiKey),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

export async function deleteConversation(
  apiKey: string,
  conversationId: string
): Promise<void> {
  const res = await fetch(url(`/api/conversations/${conversationId}`), {
    method: "DELETE",
    headers: authHeaders(apiKey),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

// ---------------------------------------------------------------------------
// Chat (SSE streaming)
// ---------------------------------------------------------------------------

export interface ChatSSECallbacks {
  onSources?: (chunks: string[]) => void;
  onToken?: (token: string) => void;
  onDone?: (conversationId: string, messageId: string) => void;
  onError?: (message: string) => void;
}

export async function streamChat(
  apiKey: string,
  provider: Provider,
  model: string,
  documentId: string,
  question: string,
  conversationId: string | null,
  callbacks: ChatSSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const body = {
    provider,
    model: model.trim(),
    document_id: documentId,
    question: question.trim(),
    conversation_id: conversationId,
  };

  const res = await fetch(url("/api/chat"), {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const msg = await errorMessage(res);
    callbacks.onError?.(msg);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.("No response body.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6);
        try {
          const evt = JSON.parse(raw);
          switch (evt.type) {
            case "sources":
              callbacks.onSources?.(evt.chunks ?? []);
              break;
            case "token":
              callbacks.onToken?.(evt.content ?? "");
              break;
            case "done":
              callbacks.onDone?.(evt.conversation_id, evt.message_id);
              break;
            case "error":
              callbacks.onError?.(evt.message ?? "Unknown error");
              break;
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function errorMessage(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      return data.error ?? `Request failed (${res.status})`;
    }
  } catch { /* fall through */ }
  return `Request failed (${res.status})`;
}
