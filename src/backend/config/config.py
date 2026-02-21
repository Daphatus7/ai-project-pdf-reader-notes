"""
Configuration management for the LLM backend service.

Ensures environment variables are loaded from the backend-local .env file to
avoid missing values when running FastAPI from the backend directory.
"""
import os
from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def read_secret_file(secret_name: str) -> str:
    """Read a secret from Docker secrets directory with fallback to environment variable"""
    secret_path = f"/run/secrets/{secret_name}"
    if os.path.exists(secret_path):
        with open(secret_path, 'r') as f:
            return f.read().strip()
    return ""


class Settings(BaseSettings):
    """Application settings loaded from environment variables and Docker secrets."""
    
    # LLM API Keys - read from Docker secrets first, then environment variables
    openai_api_key: str = Field(default_factory=lambda: read_secret_file("openai_api_key") or os.getenv("OPENAI_API_KEY", ""))
    anthropic_api_key: str = Field(default_factory=lambda: read_secret_file("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY", ""))
    google_api_key: str = Field(default_factory=lambda: read_secret_file("google_api_key") or os.getenv("GOOGLE_API_KEY", ""))
    
    # Server Configuration
    cors_origins: str = Field(default="http://localhost:3000")

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list, auto-adding https:// if no protocol specified"""
        return [origin.strip() for origin in self.cors_origins.split(',')]

    log_level: str = Field(default="INFO")
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    # LLM Configuration
    default_provider: str = Field(default="openai")
    default_model: str = Field(default="gpt-5-nano-2025-08-07")
    max_tokens: int = Field(default=1000)
    temperature: float = Field(default=0.7)
    timeout: int = Field(default=30)
    max_retries: int = Field(default=3)
    # Database
    redis_url: str = Field(default="")

    # Conversation Storage - Redis Thread Configuration
    redis_thread_ttl: int = Field(default=600)   # 10 minutes
    redis_max_tokens: int = Field(default=20000)  # Max tokens in Redis thread

    # Conversation Storage - Cold Start Configuration
    cold_start_max_messages: int = Field(default=10)    # Max messages to load
    cold_start_max_tokens: int = Field(default=200000)  # Max tokens to load

    # Free tier usage limits
    free_max_projects: int = Field(default=2)
    free_max_documents: int = Field(default=4)
    free_max_notes: int = Field(default=10)
    free_max_tokens: int = Field(default=100000)

    # Stripe
    stripe_secret_key: str = Field(default="")
    stripe_webhook_secret: str = Field(default="")
    stripe_payment_link_monthly: str = Field(default="")
    stripe_payment_link_yearly: str = Field(default="")

    # Monitoring
    sentry_dsn: str = Field(default="")

    # Optional PDF processing service — leave empty to disable RAG
    pdf_backend_url: str = Field(default="")

    # Pydantic V2 style config (replaces deprecated inner class Config)
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / '.env',
        case_sensitive=False,
    )


# Global settings instance
settings = Settings()
