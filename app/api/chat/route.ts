import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import OpenAI, { APIError } from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_MODEL_LEN = 128;

type Provider = "openai" | "gemini";

function maxDocumentBytes(): number {
  const raw = process.env.MAX_DOCUMENT_BYTES;
  if (raw === undefined || raw === "") return DEFAULT_MAX_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function parseProvider(raw: unknown): Provider | null {
  if (raw === "openai" || raw === "gemini") return raw;
  return null;
}

function buildUserPrompt(document: string, question: string): string {
  return `Here's a document: ${document} \n\n---\n\n ${question}`;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing or invalid Authorization header (use Bearer token)." },
      { status: 401 },
    );
  }
  const apiKey = auth.slice("Bearer ".length).trim();
  if (!apiKey) {
    return Response.json({ error: "Missing API key." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const providerRaw = formData.get("provider");
  const modelRaw = formData.get("model");
  const file = formData.get("file");
  const questionRaw = formData.get("question");

  const provider = parseProvider(providerRaw);
  if (!provider) {
    return Response.json(
      { error: 'Invalid or missing provider (use "openai" or "gemini").' },
      { status: 400 },
    );
  }

  if (typeof modelRaw !== "string" || !modelRaw.trim()) {
    return Response.json({ error: "Model is required." }, { status: 400 });
  }
  const model = modelRaw.trim();
  if (model.length > MAX_MODEL_LEN) {
    return Response.json(
      { error: `Model id is too long (max ${MAX_MODEL_LEN} characters).` },
      { status: 400 },
    );
  }

  if (typeof questionRaw !== "string" || !questionRaw.trim()) {
    return Response.json({ error: "Question is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "A document file is required." }, { status: 400 });
  }

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".txt") && !lower.endsWith(".md")) {
    return Response.json(
      { error: "Only .txt and .md files are supported." },
      { status: 400 },
    );
  }

  const maxBytes = maxDocumentBytes();
  if (file.size > maxBytes) {
    return Response.json(
      { error: `File too large (max ${maxBytes} bytes).` },
      { status: 413 },
    );
  }

  let document: string;
  try {
    document = await file.text();
  } catch {
    return Response.json({ error: "Could not read file." }, { status: 400 });
  }

  const question = questionRaw.trim();
  const prompt = buildUserPrompt(document, question);

  if (provider === "openai") {
    return streamOpenAI(apiKey, model, prompt);
  }
  return streamGemini(apiKey, model, prompt);
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Response> {
  const client = new OpenAI({ apiKey });

  let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    stream = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });
  } catch (err: unknown) {
    return openAIErrorResponse(err);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) controller.enqueue(encoder.encode(content));
        }
        controller.close();
      } catch (err: unknown) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function streamGemini(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Response> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model });

  let result: Awaited<
    ReturnType<typeof generativeModel.generateContentStream>
  >;
  try {
    result = await generativeModel.generateContentStream(prompt);
  } catch (err: unknown) {
    return geminiErrorResponse(err);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          let text: string;
          try {
            text = chunk.text();
          } catch {
            continue;
          }
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err: unknown) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function openAIErrorResponse(err: unknown): Response {
  if (err instanceof APIError) {
    const status =
      err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    const message = err.message || "OpenAI request failed.";
    return Response.json({ error: message }, { status });
  }
  return Response.json({ error: "Unexpected error calling OpenAI." }, { status: 500 });
}

function geminiErrorResponse(err: unknown): Response {
  if (err instanceof GoogleGenerativeAIFetchError) {
    const status =
      err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    const message = err.message || "Gemini request failed.";
    return Response.json({ error: message }, { status });
  }
  if (err instanceof Error) {
    return Response.json({ error: err.message }, { status: 502 });
  }
  return Response.json({ error: "Gemini request failed." }, { status: 500 });
}
