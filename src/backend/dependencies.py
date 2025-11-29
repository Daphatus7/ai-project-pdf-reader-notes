"""
Dependency injection container for the LLM backend service
"""
import logging
from typing import Dict, Any

from src.backend.services.service import Service


class Dependencies:
    """Dependency injection container"""
    
    def __init__(self):
        super().__init__()
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
        from src.backend.services.llm_service.configuration import get_default_config
        from src.backend.services.llm_service.llm_service import LlmService
        config = get_default_config()
        llm_service = LlmService()
        self.register('llm_service', llm_service)
    
    def get(self, service_name: str) -> Any:
        """Get a service by name"""
        if not self._initialized:
            self.initialize()
        
        if service_name not in self._services:
            raise ValueError(f"Service '{service_name}' not found")
        
        return self._services[service_name]
    
    def shutdown(self):
        """Shutdown all services"""
        for service_name, service in self._services.items():
            service.shutdown()
        #clear services
        self._services.clear()
    
    def register(self, service_name: str, service: Any):
        """Register a service"""
        self._services[service_name] = service

    def unregister(self, service_name: str):
        """Unregister a service"""
        if service_name not in self._services:
            return
        #shut down the service
        service = self._services[service_name]
        service.shutdown()
        del self._services[service_name]
        
# Global dependencies instance
dependencies = Dependencies()
