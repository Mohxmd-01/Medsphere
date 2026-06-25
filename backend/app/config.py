import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # API credentials and configs
    OPENAI_API_KEY: str = Field(default=os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY", ""))
    OPENAI_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini")

    # JWT Authentication settings
    JWT_SECRET: str = Field(default="8f9a2e6b7d8c9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)

    # MongoDB Configurations
    MONGO_URI: str = Field(default="mongodb://localhost:27017/medsphere")
    MONGO_DB_NAME: str = Field(default="medsphere")

    # Neo4j Configurations
    NEO4J_URI: str = Field(default="bolt://localhost:7687")
    NEO4J_USER: str = Field(default="neo4j")
    NEO4J_PASSWORD: str = Field(default="password")

    # Qdrant Configurations
    QDRANT_HOST: str = Field(default="localhost")
    QDRANT_PORT: int = Field(default=6333)

    # Embedding Configurations
    EMBEDDING_MODEL_NAME: str = Field(default="BAAI/bge-large-en-v1.5")

    # Workspace data location (default to current directory where CSVs reside)
    DATA_DIR: str = Field(default="d:/PROJECT/MedSphere")

    # Enable mock database engines if real database connections fail
    ALLOW_MOCK_FALLBACK: bool = Field(default=True)

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
print(f"[Config] Loaded settings. OpenAI Model: {settings.OPENAI_MODEL}, Mock Fallback: {settings.ALLOW_MOCK_FALLBACK}")
