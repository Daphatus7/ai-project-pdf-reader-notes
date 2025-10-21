"""
OpenAI provider implementation
Translated from TypeScript OpenAIProvider.ts
"""
import openai
from typing import List, Dict, Any, Optional
from ..types import (
    UnifiedInput, LLMResponse, ProviderCapabilities, LLMError,
    RateLimitError, QuotaExceededError
)
from .base import LLMProvider


class OpenAIProviderConfig:
    """OpenAI provider configuration"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries


class OpenAIProvider(LLMProvider):
    """OpenAI provider implementation"""
    
    def __init__(self, config: OpenAIProviderConfig):
        self._name = 'openai'
        self._capabilities = ProviderCapabilities(
            supported_modalities=['text', 'image'],
            max_input_size=128 * 1024,  # 128KB
            max_image_size=20 * 1024 * 1024,  # 20MB
            max_audio_size=0,  # OpenAI doesn't support audio
            max_tokens=4096,
            supported_image_formats=['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            supported_audio_formats=[],
            cost_per_token=0.00003,  # Estimated
            average_response_time=2000  # 2 seconds
        )
        
        self.client = openai.AsyncOpenAI(
            api_key=config.api_key,
            base_url=config.base_url,
            timeout=config.timeout,
            max_retries=config.max_retries
        )
        self.model = config.model
    
    @property
    def name(self):
        return self._name
    
    @property
    def capabilities(self):
        return self._capabilities
    
    async def process(self, input_data: UnifiedInput) -> LLMResponse:
        """Process input using OpenAI API"""
        self.validate_input(input_data)
        
        import time
        start_time = time.time()
        
        try:
            messages = self._build_messages(input_data)
            
            request_payload: Dict[str, Any] = {
                'model': self.model,
                'messages': messages,
                'max_completion_tokens': input_data.metadata.get('max_tokens', 1000)
            }

            temperature = input_data.metadata.get('temperature')
            if temperature is not None:
                request_payload['temperature'] = temperature

            response = await self.client.chat.completions.create(**request_payload)
            
            response_time = int((time.time() - start_time) * 1000)
            
            return LLMResponse(
                content=response.choices[0].message.content or '',
                provider=self.name,
                model=self.model,
                usage={
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                } if response.usage else None,
                metadata={
                    'finish_reason': response.choices[0].finish_reason,
                    'response_time': response_time,
                    'cost': self._estimate_cost_from_usage(response.usage) if response.usage else None
                },
                raw=response
            )
        except Exception as e:
            raise self._handle_error(e)
    
    def _build_messages(self, input_data: UnifiedInput) -> List[Dict[str, Any]]:
        """Build OpenAI messages format"""
        messages = []
        content = []
        
        # Add text content
        if input_data.text:
            content.append({
                'type': 'text',
                'text': input_data.text
            })
        
        # Add image content
        if input_data.images:
            for image in input_data.images:
                content.append({
                    'type': 'image_url',
                    'image_url': {
                        'url': image.content,
                        'detail': 'auto'
                    }
                })
        
        # Add system context if available
        if input_data.metadata.get('context'):
            messages.append({
                'role': 'system',
                'content': input_data.metadata['context']
            })
        
        # Add user message
        messages.append({
            'role': 'user',
            'content': content
        })
        
        return messages
    
    def _handle_error(self, error: Exception) -> LLMError:
        """Handle OpenAI API errors"""
        if hasattr(error, 'status_code'):
            if error.status_code == 429:
                return RateLimitError(
                    'OpenAI rate limit exceeded',
                    self.name,
                    error
                )
            elif error.status_code == 402:
                return QuotaExceededError(
                    'OpenAI quota exceeded',
                    self.name,
                    error
                )
        
        return LLMError(
            str(error) or 'OpenAI API error',
            self.name,
            getattr(error, 'status_code', None),
            error
        )
    
    def _estimate_cost_from_usage(self, usage) -> float:
        """Estimate cost from usage data"""
        if not self.capabilities.cost_per_token or not usage:
            return 0.0
        return usage.total_tokens * self.capabilities.cost_per_token
    
    async def health_check(self) -> bool:
        """Health check for OpenAI"""
        try:
            models = await self.client.models.list()
            return hasattr(models, 'data') and isinstance(models.data, list)
        except Exception:
            return False
