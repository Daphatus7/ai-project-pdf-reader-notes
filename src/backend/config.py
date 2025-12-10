"""
Configuration management for the LLM backend service
"""
import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings


def read_secret_file(secret_name: str) -> str:
    """Read a secret from Docker secrets directory with fallback to environment variable"""
    secret_path = f"/run/secrets/{secret_name}"
    if os.path.exists(secret_path):
        with open(secret_path, 'r') as f:
            return f.read().strip()
    return ""


class Settings(BaseSettings):
    """Application settings loaded from environment variables and Docker secrets"""
    
    # LLM API Keys - read from Docker secrets first, then environment variables
    openai_api_key: str = Field(default_factory=lambda: read_secret_file("openai_api_key") or os.getenv("OPENAI_API_KEY", ""))
    anthropic_api_key: str = Field(default_factory=lambda: read_secret_file("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY", ""))
    google_api_key: str = Field(default_factory=lambda: read_secret_file("google_api_key") or os.getenv("GOOGLE_API_KEY", ""))
    
    # Server Configuration
    cors_origins: str = Field(
        default="http://localhost:3000",
        env="CORS_ORIGINS"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list"""
        return [origin.strip() for origin in self.cors_origins.split(',')]
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    
    # LLM Configuration
    default_provider: str = Field(default="openai", env="DEFAULT_PROVIDER")
    default_model: str = Field(default="gpt-5-nano-2025-08-07", env="DEFAULT_MODEL")
    max_tokens: int = Field(default=1000, env="MAX_TOKENS")
    temperature: float = Field(default=0.7, env="TEMPERATURE")
    timeout: int = Field(default=30, env="TIMEOUT")
    max_retries: int = Field(default=3, env="MAX_RETRIES")
    
    class Config:
        env_file = "../../.env"
        case_sensitive = False


# Global settings instance
settings = Settings()
