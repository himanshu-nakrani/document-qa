"""Production middleware: request IDs, rate limiting, structured logging."""

import logging
import time
import uuid
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from backend.settings import settings

logger = logging.getLogger("ragapp")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a unique request ID to every request / response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory sliding-window rate limiter per Authorization bearer token."""

    def __init__(self, app, rpm: int = 60) -> None:  # type: ignore[override]
        super().__init__(app)
        self.rpm = rpm
        self._buckets: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            key = auth[7:20]  # first 13 chars as bucket id
        else:
            return await call_next(request)

        now = time.time()
        window = self._buckets[key]
        # Prune old entries
        window[:] = [t for t in window if now - t < 60]
        if len(window) >= self.rpm:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded. Try again later."},
                headers={"Retry-After": "60"},
            )
        window.append(now)
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log request method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        request_id = getattr(request.state, "request_id", "-")
        logger.info(
            "%s %s → %d (%.0fms) [%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response
