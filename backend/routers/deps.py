"""Shared FastAPI dependencies for routers."""


def extract_api_key(authorization: str | None) -> str | None:
    """Extract and validate a Bearer token from an Authorization header.

    Returns the API key string, or ``None`` if the header is missing /
    malformed / empty.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    key = authorization.removeprefix("Bearer ").strip()
    return key or None
