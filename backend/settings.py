from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Upload / indexing limits ---
    max_document_bytes: int = Field(default=10 * 1024 * 1024, alias="MAX_DOCUMENT_BYTES")
    max_chunks: int = Field(
        default=800,
        alias="MAX_CHUNKS",
        description="Safety cap on number of chunks indexed per document.",
    )
    chunk_size: int = Field(default=1200, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, alias="CHUNK_OVERLAP")
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")

    # --- Storage ---
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    vector_store_directory: str = Field(
        default="data/vectors",
        alias="VECTOR_STORE_DIRECTORY",
        description="Directory for per-document embedding stores (.npz).",
    )
    database_path: str = Field(
        default="data/ragapp.db",
        alias="DATABASE_PATH",
        description="SQLite database file path.",
    )

    # Kept for backward compat during migration; new code uses DB.
    document_registry_path: str = Field(
        default="data/documents.json",
        alias="DOCUMENT_REGISTRY_PATH",
    )

    # --- CORS ---
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
        description="Comma-separated list of allowed browser origins.",
    )

    # --- Embedding model defaults ---
    default_embedding_model_openai: str = Field(
        default="text-embedding-3-small",
        alias="DEFAULT_EMBEDDING_MODEL_OPENAI",
    )
    default_embedding_model_gemini: str = Field(
        default="models/gemini-embedding-001",
        alias="DEFAULT_EMBEDDING_MODEL_GEMINI",
    )

    # --- Production settings ---
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    rate_limit_rpm: int = Field(
        default=60,
        alias="RATE_LIMIT_RPM",
        description="Max requests per minute per API key.",
    )
    max_conversation_history: int = Field(
        default=50,
        alias="MAX_CONVERSATION_HISTORY",
        description="Max messages to include in multi-turn context.",
    )
    allowed_file_types: str = Field(
        default=".pdf,.txt,.md,.docx,.csv",
        alias="ALLOWED_FILE_TYPES",
        description="Comma-separated list of allowed file extensions.",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_extensions(self) -> set[str]:
        return {e.strip().lower() for e in self.allowed_file_types.split(",") if e.strip()}


settings = Settings()
