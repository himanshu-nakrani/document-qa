"""Embedding helpers for OpenAI and Gemini."""

from openai import AsyncOpenAI


async def embed_texts_openai(
    api_key: str,
    model: str,
    texts: list[str],
) -> list[list[float]]:
    """Batch embed with OpenAI (handles batching for large lists)."""
    client = AsyncOpenAI(api_key=api_key)
    out: list[list[float]] = []
    batch_size = 64
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp = await client.embeddings.create(model=model, input=batch)
        for item in resp.data:
            out.append(list(item.embedding))
    return out


def embed_texts_gemini_sync(api_key: str, model: str, texts: list[str]) -> list[list[float]]:
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    out: list[list[float]] = []
    for text in texts:
        result = genai.embed_content(
            model=model,
            content=text,
            task_type="retrieval_document",
        )
        emb = result.get("embedding") if isinstance(result, dict) else getattr(result, "embedding", None)
        if emb is None:
            raise ValueError("Gemini returned no embedding for a chunk.")
        out.append(list(emb))
    return out


def embed_query_gemini_sync(api_key: str, model: str, text: str) -> list[float]:
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    result = genai.embed_content(
        model=model,
        content=text,
        task_type="retrieval_query",
    )
    emb = result.get("embedding") if isinstance(result, dict) else getattr(result, "embedding", None)
    if emb is None:
        raise ValueError("Gemini returned no embedding for the question.")
    return list(emb)


async def embed_query_openai(api_key: str, model: str, text: str) -> list[float]:
    client = AsyncOpenAI(api_key=api_key)
    resp = await client.embeddings.create(model=model, input=text)
    return list(resp.data[0].embedding)
