import json
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env into os.environ so that any code using os.environ directly also works
_env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(_env_path, override=False)



class Settings(BaseSettings):
    """Application settings loaded from environment variables and Docker secrets."""
    # Supabase / API keys — loaded from env vars or .env file by pydantic-settings
    supabase_url: str
    supabase_secret_key: str
    openai_api_key: str

    redis_url: str = Field(default="redis://localhost:6379")
    instance_id: str = Field(default="default")

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
        env_file=Path(__file__).resolve().parent.parent / '.env',
        case_sensitive=False,
        # Skip empty env vars (e.g. ALLOWED_ORIGINS="") and fall back to field defaults,
        # preventing json.loads("") from crashing before field_validator runs.
        env_ignore_empty=True,
    )


# Global settings instance — loaded from env vars and .env file via pydantic-settings
settings = Settings()
