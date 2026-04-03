"""Sentence-aware character-based chunking with overlap and metadata."""


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split text into overlapping chunks, preferring sentence boundaries."""
    text = text.strip()
    if not text:
        return []

    if chunk_overlap >= chunk_size:
        chunk_overlap = max(0, chunk_size // 5)

    # Sentence boundary characters
    sentence_endings = {'.', '!', '?', '\n'}

    chunks: list[str] = []
    i = 0
    n = len(text)

    while i < n:
        end = min(i + chunk_size, n)

        # If we're not at the end, try to find a sentence boundary to break at
        if end < n:
            # Look backwards from `end` for a sentence boundary (within last 20% of chunk)
            search_start = max(i + int(chunk_size * 0.8), i)
            best_break = end
            for j in range(end - 1, search_start - 1, -1):
                if text[j] in sentence_endings:
                    best_break = j + 1
                    break
            end = best_break

        piece = text[i:end].strip()
        if piece:
            chunks.append(piece)

        if end >= n:
            break

        # Move forward by (chunk_end - overlap), but at least 1 character
        step = max(1, (end - i) - chunk_overlap)
        i += step

    return chunks
