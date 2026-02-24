from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = Field(default="")
    supabase_secret_key: str = Field(default="")
    openai_api_key: str = Field(default="")

    redis_url: str = Field(default="redis://localhost:6379/0")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8001)

    # Only the main backend is allowed to call this service.
    # Set to your main backend's URL in .env, e.g. https://api.yourapp.com
    allowed_origins: List[str] = Field(default=["http://localhost:8000"])

    class Config:
        env_file = Path(__file__).resolve().parent / '.env'
        case_sensitive = False


settings = Settings()
