import os
import shutil
from pathlib import Path
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Set environment variables for testing before importing settings or app.
# Note: This is done before imports because Pydantic BaseSettings evaluates
# the environment variables at module import time.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEST_DATA_DIR = BASE_DIR / "data"

os.environ["DATABASE_PATH"] = str(TEST_DATA_DIR / "test_ragapp.db")
os.environ["VECTOR_STORE_DIRECTORY"] = str(TEST_DATA_DIR / "test_vectors")
os.environ["DOCUMENT_REGISTRY_PATH"] = str(TEST_DATA_DIR / "test_documents.json")
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["RATE_LIMIT_RPM"] = "1000"

from backend.main import app
from backend.database import init_db, close_db
from backend.settings import settings


def cleanup_test_data():
    if os.path.exists(settings.database_path):
        try:
            os.remove(settings.database_path)
        except OSError:
            pass
    if os.path.exists(settings.vector_store_directory):
        try:
            shutil.rmtree(settings.vector_store_directory)
        except OSError:
            pass
    if os.path.exists(settings.document_registry_path):
        try:
            os.remove(settings.document_registry_path)
        except OSError:
            pass


@pytest_asyncio.fixture(autouse=True)
async def db_setup():
    # Clean up before test
    cleanup_test_data()

    await init_db()
    yield
    await close_db()
    
    # Clean up after test
    cleanup_test_data()


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
