"""LLM helpers for RAG prompt building and streaming, with multi-turn support."""

from collections.abc import AsyncIterator, Iterator

from openai import AsyncOpenAI


SYSTEM_PROMPT = (
    "You are a helpful, precise document assistant. Answer questions using ONLY "
    "the provided context excerpts. When you use information from a specific excerpt, "
    "cite it with [1], [2], etc. If the answer is not supported by the context, "
    "clearly say you cannot find it in the document. Format your answers with "
    "markdown for readability."
)


def build_rag_prompt(
    context_chunks: list[str],
    question: str,
    *,
    history: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Build a multi-turn message list for the LLM.

    Returns a list of {"role": ..., "content": ...} dicts compatible with
    both OpenAI and Gemini chat APIs.
    """
    numbered = "\n\n---\n\n".join(
        f"[{i + 1}] {chunk}" for i, chunk in enumerate(context_chunks)
    )
    context_msg = f"Context excerpts from the document:\n\n{numbered}"

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": context_msg},
    ]

    # Inject conversation history (assistant and user turns only)
    if history:
        for h in history:
            if h["role"] in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})

    # Current question
    messages.append({"role": "user", "content": question})

    return messages


async def create_openai_text_stream(
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Await stream creation (raises APIError), then yield text chunks."""
    client = AsyncOpenAI(api_key=api_key)
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,  # type: ignore[arg-type]
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


def gemini_text_stream(
    api_key: str,
    model_name: str,
    messages: list[dict[str, str]],
) -> Iterator[str]:
    """Sync generator of text chunks for StreamingResponse."""
    import google.generativeai as genai

    genai.configure(api_key=api_key)

    # Convert messages to Gemini format
    # Gemini uses "user" and "model" roles, and doesn't support "system" directly
    system_instruction = None
    gemini_history: list[dict] = []
    last_user_msg = ""

    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        elif msg["role"] == "user":
            last_user_msg = msg["content"]
            gemini_history.append({"role": "user", "parts": [msg["content"]]})
        elif msg["role"] == "assistant":
            gemini_history.append({"role": "model", "parts": [msg["content"]]})

    # Remove the last user message from history since we send it as the prompt
    if gemini_history and gemini_history[-1]["role"] == "user":
        gemini_history.pop()

    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_instruction,
    )

    if gemini_history:
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(last_user_msg, stream=True)
    else:
        response = model.generate_content(last_user_msg, stream=True)

    for chunk in response:
        try:
            text = chunk.text
        except (ValueError, AttributeError):
            continue
        if text:
            yield text
