import json
from pathlib import Path
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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

    class Config:
        env_file = Path(__file__).resolve().parent / '.env'
        case_sensitive = False


settings = Settings()
