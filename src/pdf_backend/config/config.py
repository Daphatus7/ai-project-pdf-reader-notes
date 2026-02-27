import json
import os
from pathlib import Path
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    """Application settings loaded from environment variables and Docker secrets."""
    # Supabase / API keys — try Docker secrets first, then env vars
    supabase_url: str = Field(os.getenv("SUPABASE_URL"))
    supabase_secret_key: str = Field(os.getenv("SUPABASE_SECRET_KEY"))
    openai_api_key: str = Field(os.getenv("OPENAI_API_KEY"))

    redis_url: str = Field(os.getenv("REDIS_URL"))

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8001)

    # Only the main backend is allowed to call this service.
    # Accepts JSON array: '["https://a.com","https://b.com"]'
    # or comma-separated:  'https://a.com,https://b.com'
    allowed_origins: List[str] = Field(default=["http://localhost:8000"])
    

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

    # Pydantic V2 style config
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / '.env',
        case_sensitive=False,
    )


# Global settings instance
settings = Settings(
    # Docker secrets take precedence over env vars
    supabase_url=os.getenv("SUPABASE_URL"),
    supabase_secret_key=os.getenv("SUPABASE_SECRET_KEY"),
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    redis_url=os.getenv("REDIS_URL")
)
