from collections.abc import AsyncIterator, Iterator

from openai import AsyncOpenAI


def build_rag_prompt(context_chunks: list[str], question: str) -> str:
    numbered = "\n\n---\n\n".join(
        f"[{i + 1}] {chunk}" for i, chunk in enumerate(context_chunks)
    )
    return (
        "You are a helpful assistant. Answer using only the context excerpts below. "
        "If the answer is not supported by the context, say you cannot find it in the document.\n\n"
        f"Context:\n{numbered}\n\n---\n\nQuestion: {question}"
    )


async def create_openai_text_stream(
    api_key: str,
    model: str,
    prompt: str,
) -> AsyncIterator[str]:
    """Await stream creation (raises APIError), then yield text chunks."""
    client = AsyncOpenAI(api_key=api_key)
    stream = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    async def iterate() -> AsyncIterator[str]:
        async for chunk in stream:
            if not chunk.choices:
                continue
            content = chunk.choices[0].delta.content
            if content:
                yield content

    return iterate()


def gemini_text_stream(api_key: str, model_name: str, prompt: str) -> Iterator[str]:
    """Sync generator of text chunks for StreamingResponse."""
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        try:
            text = chunk.text
        except (ValueError, AttributeError):
            continue
        if text:
            yield text
