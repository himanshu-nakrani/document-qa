from fastapi.testclient import TestClient

from backend.main import app
from backend.middleware import _API_CSP, _DOCS_CSP


def test_security_headers_middleware():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Content-Security-Policy") == _API_CSP


def test_security_headers_middleware_https():
    client = TestClient(app, base_url="https://testserver")
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Content-Security-Policy") == _API_CSP


def test_docs_pages_allow_swagger_cdn():
    client = TestClient(app)
    docs = client.get("/docs")
    assert docs.status_code == 200
    assert docs.headers.get("Content-Security-Policy") == _DOCS_CSP
    assert "unsafe-eval" not in docs.headers.get("Content-Security-Policy", "")

    redoc = client.get("/redoc")
    assert redoc.status_code == 200
    assert redoc.headers.get("Content-Security-Policy") == _DOCS_CSP

    openapi = client.get("/openapi.json")
    assert openapi.status_code == 200
    assert openapi.headers.get("Content-Security-Policy") == _API_CSP
