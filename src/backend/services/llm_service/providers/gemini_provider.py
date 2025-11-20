"""
Gemini provider implementation
Translated from TypeScript GeminiProvider.ts
"""
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from ..types import (
    UnifiedInput, LLMResponse, ProviderCapabilities, LLMError,
    RateLimitError, QuotaExceededError
)
from .base import LLMProvider


class GeminiProviderConfig:
    """Gemini provider configuration"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries


class GeminiProvider(LLMProvider):
    """Gemini provider implementation"""
    
    def __init__(self, config: GeminiProviderConfig):
        self._name = 'gemini'
        self._capabilities = ProviderCapabilities(
            supported_modalities=['text', 'image'],
            max_input_size=100 * 1024,  # 100KB
            max_image_size=10 * 1024 * 1024,  # 10MB
            max_audio_size=0,  # Gemini doesn't support audio in this implementation
            max_tokens=4096,
            supported_image_formats=['image/jpeg', 'image/png', 'image/webp'],
            supported_audio_formats=[],
            cost_per_token=0.00001,  # Estimated
            average_response_time=2500  # 2.5 seconds
        )
        
        # Configure Gemini
        genai.configure(api_key=config.api_key)
        self.model_name = config.model
        self.model = genai.GenerativeModel(config.model)
        self.timeout = config.timeout
        self.max_retries = config.max_retries
    
    @property
    def name(self):
        return self._name
    
    @property
    def capabilities(self):
        return self._capabilities
    
    async def process(self, input_data: UnifiedInput) -> LLMResponse:
        """Process input using Gemini API"""
        self.validate_input(input_data)
        
        import time
        start_time = time.time()
        
        try:
            # Build content for Gemini
            content = self._build_content(input_data)
            
            # Generate response
            response = await self._generate_response(content)
            
            response_time = int((time.time() - start_time) * 1000)
            
            return LLMResponse(
                content=response.text,
                provider=self.name,
                model=self.model_name,
                usage={
                    'prompt_tokens': response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
                    'completion_tokens': response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
                    'total_tokens': response.usage_metadata.total_token_count if response.usage_metadata else 0
                } if response.usage_metadata else None,
                metadata={
                    'finish_reason': response.candidates[0].finish_reason.name if response.candidates else None,
                    'response_time': response_time,
                    'cost': self._estimate_cost_from_usage(response.usage_metadata) if response.usage_metadata else None
                },
                raw=response
            )
        except Exception as e:
            raise self._handle_error(e)
    
    def _build_content(self, input_data: UnifiedInput) -> List[Any]:
        """Build content for Gemini API"""
        content = []
        
        # Add text content
        if input_data.text:
            content.append(input_data.text)
        
        # Add image content
        if input_data.images:
            for image in input_data.images:
                if image.format == 'base64':
                    # Convert base64 to PIL Image for Gemini
                    import base64
                    from PIL import Image
                    import io
                    
                    # Remove data URL prefix if present
                    image_data = image.content
                    if image_data.startswith('data:'):
                        image_data = image_data.split(',', 1)[1]
                    
                    # Decode base64 and create PIL Image
                    image_bytes = base64.b64decode(image_data)
                    pil_image = Image.open(io.BytesIO(image_bytes))
                    content.append(pil_image)
        
        return content
    
    async def _generate_response(self, content: List[Any]) -> Any:
        """Generate response using Gemini"""
        # Note: Gemini's async support is limited, so we'll use sync for now
        # In a real implementation, you might want to use asyncio.to_thread
        import asyncio
        
        def _sync_generate():
            return self.model.generate_content(content)
        
        return await asyncio.to_thread(_sync_generate)
    
    def _handle_error(self, error: Exception) -> LLMError:
        """Handle Gemini API errors"""
        error_str = str(error).lower()
        
        if 'quota' in error_str or 'limit' in error_str:
            return RateLimitError(
                'Gemini rate limit exceeded',
                self.name,
                error
            )
        elif 'billing' in error_str or 'payment' in error_str:
            return QuotaExceededError(
                'Gemini quota exceeded',
                self.name,
                error
            )
        
        return LLMError(
            str(error) or 'Gemini API error',
            self.name,
            None,
            error
        )
    
    def _estimate_cost_from_usage(self, usage_metadata) -> float:
        """Estimate cost from usage metadata"""
        if not self.capabilities.cost_per_token or not usage_metadata:
            return 0.0
        return usage_metadata.total_token_count * self.capabilities.cost_per_token
    
    async def health_check(self) -> bool:
        """Health check for Gemini"""
        try:
            # Simple test request
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
