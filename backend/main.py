from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import chat, ingest
from backend.settings import settings

app = FastAPI(title="Document QA API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
