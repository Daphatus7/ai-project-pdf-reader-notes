import json
import os
from pathlib import Path
from typing import List
from pydantic import Field, field_validator
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
    supabase_url: str = Field(default="")
    supabase_secret_key: str = Field(default="")
    openai_api_key: str = Field(default="")

    redis_url: str = Field(default="redis://localhost:6379/0")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8001)

    # Only the main backend is allowed to call this service.
    # Accepts JSON array: '["https://a.com","https://b.com"]'
    # or comma-separated:  'https://a.com,https://b.com'
    allowed_origins: List[str] = Field(default=["http://localhost:8000"])
    

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list, auto-adding https:// if no protocol specified"""
        return [origin.strip() for origin in self.cors_origins.split(',')]
    # Conversation Storage - Redis Thread Configuration

    # Pydantic V2 style config (replaces deprecated inner class Config)
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / '.env',
        case_sensitive=False,
    )
    
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: object) -> object:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [o.strip() for o in stripped.split(",") if o.strip()]
        return v


# Global settings instance
settings = Settings()
