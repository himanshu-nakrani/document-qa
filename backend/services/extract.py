"""Extract plain text from uploaded bytes (PDF, UTF-8 text, markdown, DOCX, CSV)."""

import csv
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

    if suffix == ".docx":
        try:
            from docx import Document
        except ImportError:
            raise ValueError(
                "python-docx is not installed. Install it with: pip install python-docx"
            )
        doc = Document(io.BytesIO(raw))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n\n".join(paragraphs).strip()
        if not text:
            raise ValueError("Could not extract text from DOCX (empty document).")
        return text

    if suffix == ".csv":
        try:
            decoded = raw.decode("utf-8")
        except UnicodeDecodeError as e:
            raise ValueError("CSV file is not valid UTF-8.") from e

        reader_csv = csv.reader(io.StringIO(decoded))
        lines: list[str] = []
        for row in reader_csv:
            lines.append(" | ".join(cell.strip() for cell in row))
        text = "\n".join(lines).strip()
        if not text:
            raise ValueError("CSV file appears to be empty.")
        return text

    raise ValueError(f"Unsupported file type: {suffix}")


def allowed_suffix(filename: str) -> bool:
    from backend.settings import settings
    return PurePath(filename.lower()).suffix in settings.allowed_extensions
