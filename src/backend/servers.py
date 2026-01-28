"""
Dependency injection container for the LLM backend service
"""
import logging
from typing import Dict, Any
from src.backend.services.llm_service.llm_service import LlmService
from src.backend.services.storage import RedisStorage
from src.backend.services.storage.supabase_storage import SupabaseStorage
from src.backend.services.context_provider.rag_service import RagService
class Services:
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
        # Initialize storage service first (other services depend on it)
        redis_storage = RedisStorage()
        redis_storage.start()
        self.register('storage', redis_storage)

        # Initialize Supabase database
        supabase_storage = SupabaseStorage()
        supabase_storage.start()
        self.register('database_service', supabase_storage)

        # Initialize LLM service (uses storage service for checkpointer and database for persistence)
        llm_service = LlmService(
            checkpointer=redis_storage.checkpointer,
            database=supabase_storage,
            storage_service=redis_storage
        )
        self.register('llm_service', llm_service)

        # Initialize RAG service (for document upload and processing)
        rag_service = RagService()
        rag_service.start()
        self.register('rag_service', rag_service)
        
    def get_service(self, service_name: str) -> Any:
        """Get a service by name"""
        if not self._initialized:
            self.initialize()
        
        if service_name not in self._services:
            raise ValueError(f"Service '{service_name}' not found")
        
        return self._services[service_name]
    
    def shutdown(self):
        """Shutdown all services"""
        for service_name, service in self._services.items():
            if hasattr(service, 'shut_down'):
                service.shut_down()
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
        if hasattr(service, 'shut_down'):
            service.shut_down()
        del self._services[service_name]
        
# Global dependencies instance
services = Services()
