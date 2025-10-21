"""
Claude (Anthropic) provider implementation
Translated from TypeScript ClaudeProvider.ts
"""
import anthropic
from typing import List, Dict, Any, Optional
from ..types import (
    UnifiedInput, LLMResponse, ProviderCapabilities, LLMError,
    RateLimitError, QuotaExceededError
)
from .base import LLMProvider


class ClaudeProviderConfig:
    """Claude provider configuration"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022",
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries


class ClaudeProvider(LLMProvider):
    """Claude provider implementation"""
    
    def __init__(self, config: ClaudeProviderConfig):
        self._name = 'claude'
        self._capabilities = ProviderCapabilities(
            supported_modalities=['text', 'image'],
            max_input_size=200 * 1024,  # 200KB
            max_image_size=5 * 1024 * 1024,  # 5MB
            max_audio_size=0,  # Claude doesn't support audio
            max_tokens=4096,
            supported_image_formats=['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            supported_audio_formats=[],
            cost_per_token=0.000015,  # Estimated
            average_response_time=3000  # 3 seconds
        )
        
        self.client = anthropic.AsyncAnthropic(
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
        """Process input using Claude API"""
        self.validate_input(input_data)
        
        import time
        start_time = time.time()
        
        try:
            messages = self._build_messages(input_data)
            
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=input_data.metadata.get('max_tokens', 1000),
                temperature=input_data.metadata.get('temperature', 0.7),
                messages=messages
            )
            
            response_time = int((time.time() - start_time) * 1000)
            
            content = ""
            if response.content and len(response.content) > 0:
                if response.content[0].type == 'text':
                    content = response.content[0].text
            
            return LLMResponse(
                content=content,
                provider=self.name,
                model=self.model,
                usage={
                    'prompt_tokens': response.usage.input_tokens,
                    'completion_tokens': response.usage.output_tokens,
                    'total_tokens': response.usage.input_tokens + response.usage.output_tokens
                } if response.usage else None,
                metadata={
                    'finish_reason': response.stop_reason,
                    'response_time': response_time,
                    'cost': self._estimate_cost_from_usage(response.usage) if response.usage else None
                },
                raw=response
            )
        except Exception as e:
            raise self._handle_error(e)
    
    def _build_messages(self, input_data: UnifiedInput) -> List[Dict[str, Any]]:
        """Build Claude messages format"""
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
                    'type': 'image',
                    'source': {
                        'type': 'base64',
                        'media_type': image.mime_type,
                        'data': self._extract_base64_data(image.content)
                    }
                })
        
        # Add system context if available
        if input_data.metadata.get('context'):
            messages.append({
                'role': 'user',
                'content': [
                    {
                        'type': 'text',
                        'text': f"System context: {input_data.metadata['context']}"
                    },
                    *content
                ]
            })
        else:
            messages.append({
                'role': 'user',
                'content': content[0] if len(content) == 1 else content
            })
        
        return messages
    
    def _extract_base64_data(self, data_url: str) -> str:
        """Extract base64 data from data URL"""
        if data_url.startswith('data:'):
            return data_url.split(',', 1)[1]
        return data_url
    
    def _handle_error(self, error: Exception) -> LLMError:
        """Handle Claude API errors"""
        if hasattr(error, 'status_code'):
            if error.status_code == 429:
                return RateLimitError(
                    'Claude rate limit exceeded',
                    self.name,
                    error
                )
            elif error.status_code == 402:
                return QuotaExceededError(
                    'Claude quota exceeded',
                    self.name,
                    error
                )
        
        return LLMError(
            str(error) or 'Claude API error',
            self.name,
            getattr(error, 'status_code', None),
            error
        )
    
    def _estimate_cost_from_usage(self, usage) -> float:
        """Estimate cost from usage data"""
        if not self.capabilities.cost_per_token or not usage:
            return 0.0
        total_tokens = usage.input_tokens + usage.output_tokens
        return total_tokens * self.capabilities.cost_per_token
    
    async def health_check(self) -> bool:
        """Health check for Claude"""
        try:
            # Claude doesn't have a direct models list API, use a simple test request
            test_input = UnifiedInput(
                text="Hello",
                metadata={
                    'total_size': 5,
                    'modalities': ['text'],
                    'max_tokens': 10
                }
            )
            
            await self.process(test_input)
            return True
        except Exception:
            return False
