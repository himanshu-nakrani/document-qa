"""Character-based chunking with overlap."""


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    text = text.strip()
    if not text:
        return []

    if chunk_overlap >= chunk_size:
        chunk_overlap = max(0, chunk_size // 5)

    chunks: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        end = min(i + chunk_size, n)
        piece = text[i:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        i += chunk_size - chunk_overlap

    return chunks
