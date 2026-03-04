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
    allowed_origins: str = Field(default="http://localhost:8000")

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list, auto-adding https:// if no protocol specified"""
        return [origin.strip() for origin in self.allowed_origins.split(',')]

    # Pydantic V2 style config
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / '.env',
        case_sensitive=False,
    )


# Global settings instance — loaded from env vars and .env file via pydantic-settings
settings = Settings()
