"""
Main LLM service
Translated from TypeScript llm_call.ts
"""
from typing import List, Dict, Any, Optional, AsyncGenerator
from llm.types import (
    InputContent, TextContent, ImageContent, AudioContent,
    LLMResponse, FrameworkConfig, ProviderConfig,
    RoutingConfig, ProcessingConfig, LLMError
)
from llm.routing.router import LLMRouter
from llm.coordinator import MultimodalCoordinator
from llm.providers.openai_provider import OpenAIProvider, OpenAIProviderConfig
from llm.providers.claude_provider import ClaudeProvider, ClaudeProviderConfig
from llm.providers.gemini_provider import GeminiProvider, GeminiProviderConfig


class LLMService:
    """Main LLM service"""
    
    def __init__(self, config: FrameworkConfig):
        self.config = config
        self.router: Optional[LLMRouter] = None
        self.coordinator: Optional[MultimodalCoordinator] = None
        self.is_initialized = False
        self._initialize()
    
    def _initialize(self):
        """Initialize service"""
        self.router = LLMRouter(self.config.routing)
        self.coordinator = MultimodalCoordinator(self.router)
        
        # Register providers
        self._register_providers()
        
        self.is_initialized = True
    
    def _register_providers(self):
        """Register all configured providers"""
        for provider_config in self.config.providers:
            if not provider_config.enabled:
                continue
            
            try:
                provider = self._create_provider(provider_config)
                self.router.register_provider(provider)
            except Exception as e:
                print(f'Failed to register provider {provider_config.name}: {e}')
    
    def _create_provider(self, config: ProviderConfig):
        """Create provider instance"""
        if config.name == 'openai':
            return OpenAIProvider(OpenAIProviderConfig(
                api_key=config.api_key,
                model=config.model,
                base_url=config.base_url,
                timeout=config.timeout,
                max_retries=config.max_retries
            ))
        elif config.name == 'claude':
            return ClaudeProvider(ClaudeProviderConfig(
                api_key=config.api_key,
                model=config.model,
                base_url=config.base_url,
                timeout=config.timeout,
                max_retries=config.max_retries
            ))
        elif config.name == 'gemini':
            return GeminiProvider(GeminiProviderConfig(
                api_key=config.api_key,
                model=config.model,
                timeout=config.timeout,
                max_retries=config.max_retries
            ))
        else:
            raise LLMError(f'Unknown provider: {config.name}', 'openai')
    
    async def process(self, inputs: List[InputContent]) -> LLMResponse:
        """Process multimodal input"""
        if not self.is_initialized:
            raise LLMError('LLM service not initialized', 'openai')
        
        if not inputs:
            raise LLMError('No input provided', 'openai')
        
        try:
            return await self.coordinator.coordinate_processing(inputs)
        except LLMError:
            raise
        except Exception as e:
            raise LLMError(f'Processing failed: {e}', 'openai')
    
    async def process_text(self, text: str, context: Optional[str] = None) -> LLMResponse:
        """Process single text input"""
        inputs = [TextContent(content=text)]
        
        if context:
            # Add context to metadata
            unified_input = await self.coordinator.process_mixed_input(inputs)
            unified_input.metadata['context'] = context
            
            provider = self.router.select_provider(unified_input)
            return await provider.process(unified_input)
        
        return await self.process(inputs)
    
    async def process_text_with_image(
        self,
        text: str,
        image: Dict[str, Any],
        context: Optional[str] = None
    ) -> LLMResponse:
        """Process text with image input"""
        inputs = [
            TextContent(content=text),
            ImageContent(
                content=image['content'],
                format=image['format'],
                mime_type=image['mime_type']
            )
        ]
        
        if context:
            unified_input = await self.coordinator.process_mixed_input(inputs)
            unified_input.metadata['context'] = context
            
            provider = self.router.select_provider(unified_input)
            return await provider.process(unified_input)
        
        return await self.process(inputs)
    
    async def process_audio(
        self,
        audio: Dict[str, Any],
        context: Optional[str] = None
    ) -> LLMResponse:
        """Process audio input"""
        inputs = [AudioContent(
            content=audio['content'],
            format=audio['format'],
            mime_type=audio['mime_type']
        )]
        
        if context:
            unified_input = await self.coordinator.process_mixed_input(inputs)
            unified_input.metadata['context'] = context
            
            provider = self.router.select_provider(unified_input)
            return await provider.process(unified_input)
        
        return await self.process(inputs)
    
    async def stream_chat(
        self,
        message: str,
        images: Optional[List[str]] = None,
        context: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response"""
        # For now, we'll simulate streaming by yielding chunks
        # In a real implementation, this would use the provider's streaming capabilities
        
        inputs = [TextContent(content=message)]
        
        if images:
            for image in images:
                inputs.append(ImageContent(
                    content=image,
                    format='url',
                    mime_type='image/jpeg'
                ))
        
        if context:
            unified_input = await self.coordinator.process_mixed_input(inputs)
            unified_input.metadata['context'] = context
        else:
            unified_input = await self.coordinator.process_mixed_input(inputs)
        
        provider = self.router.select_provider(unified_input)
        response = await provider.process(unified_input)
        
        # Simulate streaming by yielding chunks
        content = response.content
        chunk_size = 10  # Characters per chunk
        
        for i in range(0, len(content), chunk_size):
            chunk = content[i:i + chunk_size]
            yield {
                'content': chunk,
                'done': i + chunk_size >= len(content),
                'metadata': {
                    'provider': response.provider,
                    'model': response.model
                }
            }
    
    async def estimate_cost(self, inputs: List[InputContent]) -> float:
        """Estimate processing cost"""
        return await self.coordinator.estimate_processing_cost(inputs)
    
    async def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        health = await self.router.get_provider_health()
        stats = self.coordinator.get_processing_stats()
        
        return {
            'initialized': self.is_initialized,
            'providers': [p.name for p in self.router.get_providers()],
            'health': health,
            'stats': stats
        }
    
    def update_config(self, config: Dict[str, Any]):
        """Update configuration"""
        # Update config and reinitialize
        for key, value in config.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
        
        self._initialize()
    
    def get_router_stats(self) -> Dict[str, Any]:
        """Get router statistics"""
        return self.router.get_stats()


# Default configuration
def get_default_config() -> FrameworkConfig:
    """Get default framework configuration"""
    return FrameworkConfig(
        providers=[
            ProviderConfig(
                name='openai',
                api_key='',  # Will be loaded from environment
                model='gpt-4o-mini',
                enabled=True,
                timeout=30,
                max_retries=3
            ),
            ProviderConfig(
                name='claude',
                api_key='',  # Will be loaded from environment
                model='claude-3-5-sonnet-20241022',
                enabled=True,
                timeout=30,
                max_retries=3
            ),
            ProviderConfig(
                name='gemini',
                api_key='',  # Will be loaded from environment
                model='gemini-1.5-flash',
                enabled=True,
                timeout=30,
                max_retries=3
            )
        ],
        routing=RoutingConfig(
            default_provider='openai',
            fallback_providers=['claude', 'gemini'],
            routing_strategy='balanced',
            enable_load_balancing=True
        ),
        processing=ProcessingConfig(
            max_concurrent_requests=10,
            request_timeout=30,
            enable_caching=False,
            cache_expiration=3600,
            enable_retry=True,
            max_retries=3
        )
    )


def create_llm_service(config: Optional[Dict[str, Any]] = None) -> LLMService:
    """Create LLM service instance"""
    default_config = get_default_config()
    
    if config:
        # Update default config with provided config
        for key, value in config.items():
            if hasattr(default_config, key):
                setattr(default_config, key, value)
    
    return LLMService(default_config)
