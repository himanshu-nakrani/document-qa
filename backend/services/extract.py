"""Extract plain text from uploaded bytes (PDF, UTF-8 text, markdown)."""

import io
from pathlib import PurePath

from pypdf import PdfReader


def extract_text(*, filename: str, raw: bytes) -> str:
    suffix = PurePath(filename.lower()).suffix
    if suffix == ".pdf":
        reader = PdfReader(io.BytesIO(raw))
        parts: list[str] = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
        text = "\n\n".join(parts).strip()
        if not text:
            raise ValueError("Could not extract text from PDF (empty or scanned image-only).")
        return text

    if suffix in (".txt", ".md"):
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError as e:
            raise ValueError("File is not valid UTF-8 text.") from e

    raise ValueError(f"Unsupported file type: {suffix}")


def allowed_suffix(filename: str) -> bool:
    return PurePath(filename.lower()).suffix in (".pdf", ".txt", ".md")
