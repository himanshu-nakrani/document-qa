from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    max_document_bytes: int = Field(default=2 * 1024 * 1024, alias="MAX_DOCUMENT_BYTES")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
        description="Comma-separated list of allowed browser origins.",
    )

    vector_store_directory: str = Field(
        default="data/vectors",
        alias="VECTOR_STORE_DIRECTORY",
        description="Directory for per-document embedding stores (.npz).",
    )

    chunk_size: int = Field(default=1200, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, alias="CHUNK_OVERLAP")
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")
    max_chunks: int = Field(
        default=800,
        alias="MAX_CHUNKS",
        description="Safety cap on number of chunks indexed per document.",
    )

    document_registry_path: str = Field(
        default="data/documents.json",
        alias="DOCUMENT_REGISTRY_PATH",
    )

    default_embedding_model_openai: str = Field(
        default="text-embedding-3-small",
        alias="DEFAULT_EMBEDDING_MODEL_OPENAI",
    )
    default_embedding_model_gemini: str = Field(
        default="models/text-embedding-004",
        alias="DEFAULT_EMBEDDING_MODEL_GEMINI",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
