"""
Dependency injection container for the LLM backend service
"""
import logging
from typing import Dict, Any

from config import settings


class Dependencies:
    """Dependency injection container"""
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._initialized = False
        self._logger = logging.getLogger(__name__)
    
    def initialize(self):
        """Initialize all dependencies"""
        if self._initialized:
            return
        
        # Initialize LLM services
        self._initialize_llm_services()
        
        self._initialized = True
    
    def _initialize_llm_services(self):
        """Initialize LLM-related services"""
        from llm.llm_service import LLMService, get_default_config

        config = get_default_config()

        for provider in config.providers:
            if provider.name == 'openai':
                if settings.openai_api_key:
                    provider.api_key = settings.openai_api_key
                    provider.model = settings.default_model or provider.model
                    provider.timeout = settings.timeout
                    provider.max_retries = settings.max_retries
                    provider.enabled = True
                else:
                    provider.enabled = False
            elif provider.name == 'claude':
                if settings.anthropic_api_key:
                    provider.api_key = settings.anthropic_api_key
                    provider.timeout = settings.timeout
                    provider.max_retries = settings.max_retries
                    provider.enabled = True
                else:
                    provider.enabled = False
            elif provider.name == 'gemini':
                if settings.google_api_key:
                    provider.api_key = settings.google_api_key
                    provider.timeout = settings.timeout
                    provider.max_retries = settings.max_retries
                    provider.enabled = True
                else:
                    provider.enabled = False

        enabled_providers = [p for p in config.providers if p.enabled]

        if not enabled_providers:
            raise RuntimeError(
                "No LLM providers have been configured. Set at least one API key to enable the LLM service."
            )

        config.routing.default_provider = enabled_providers[0].name
        config.routing.fallback_providers = [p.name for p in enabled_providers[1:]]

        llm_service = LLMService(config)
        self.register('llm_service', llm_service)
        self._logger.info(
            "LLM service initialized with providers: %s",
            ', '.join(p.name for p in enabled_providers)
        )
    
    def get(self, service_name: str) -> Any:
        """Get a service by name"""
        if not self._initialized:
            self.initialize()
        
        if service_name not in self._services:
            raise ValueError(f"Service '{service_name}' not found")
        
        return self._services[service_name]
    
    def register(self, service_name: str, service: Any):
        """Register a service"""
        self._services[service_name] = service


# Global dependencies instance
dependencies = Dependencies()
