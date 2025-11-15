"""
LLM framework type definitions
Translated from TypeScript types.ts
"""
from typing import List, Optional, Dict, Any, Union, Literal
from pydantic import BaseModel
from enum import Enum


# Supported modality types
Modality = Literal['text', 'image', 'audio']

# Supported LLM provider names
LLMProviderName = Literal['openai', 'claude', 'gemini']


class TextContent(BaseModel):
    """Text input content"""
    type: Literal['text'] = 'text'
    content: str
    language: Optional[str] = None


class ImageContent(BaseModel):
    """Image input content"""
    type: Literal['image'] = 'image'
    content: str  # base64 or URL
    format: Literal['base64', 'url']
    mime_type: str
    metadata: Optional[Dict[str, Any]] = None


class AudioContent(BaseModel):
    """Audio input content"""
    type: Literal['audio'] = 'audio'
    content: str  # base64 or URL
    format: Literal['base64', 'url']
    mime_type: str
    duration: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


InputContent = Union[TextContent, ImageContent, AudioContent]


class UnifiedInput(BaseModel):
    """Unified input format for LLM processing"""
    text: Optional[str] = None
    images: Optional[List[ImageContent]] = None
    audio: Optional[List[AudioContent]] = None
    metadata: Dict[str, Any]


class LLMResponse(BaseModel):
    """LLM response format"""
    content: str
    provider: LLMProviderName
    model: str
    usage: Optional[Dict[str, int]] = None
    metadata: Optional[Dict[str, Any]] = None
    raw: Optional[Any] = None


class ProviderCapabilities(BaseModel):
    """Provider capabilities"""
    supported_modalities: List[Modality]
    max_input_size: int  # bytes
    max_image_size: int  # bytes
    max_audio_size: int  # bytes
    max_tokens: int
    supported_image_formats: List[str]
    supported_audio_formats: List[str]
    cost_per_token: Optional[float] = None
    average_response_time: Optional[int] = None


class ProviderConfig(BaseModel):
    """Provider configuration"""
    name: LLMProviderName
    api_key: str
    model: str
    base_url: Optional[str] = None
    timeout: Optional[int] = None
    max_retries: Optional[int] = None
    enabled: bool = True


class RoutingConfig(BaseModel):
    """Routing configuration"""
    default_provider: LLMProviderName
    fallback_providers: List[LLMProviderName]
    routing_strategy: Literal['cost', 'speed', 'quality', 'balanced']
    enable_load_balancing: bool = True


class ProcessingConfig(BaseModel):
    """Processing configuration"""
    max_concurrent_requests: int
    request_timeout: int
    enable_caching: bool
    cache_expiration: int  # seconds
    enable_retry: bool
    max_retries: int


class FrameworkConfig(BaseModel):
    """Framework configuration"""
    providers: List[ProviderConfig]
    routing: RoutingConfig
    processing: ProcessingConfig


# Error classes
class LLMError(Exception):
    """Base LLM error"""
    
    def __init__(
        self,
        message: str,
        provider: LLMProviderName,
        code: Optional[str] = None,
        details: Optional[Any] = None
    ):
        super().__init__(message)
        self.provider = provider
        self.code = code
        self.details = details


class ValidationError(LLMError):
    """Validation error"""
    
    def __init__(self, message: str, provider: LLMProviderName, details: Optional[Any] = None):
        super().__init__(message, provider, 'VALIDATION_ERROR', details)


class RateLimitError(LLMError):
    """Rate limit error"""
    
    def __init__(self, message: str, provider: LLMProviderName, details: Optional[Any] = None):
        super().__init__(message, provider, 'RATE_LIMIT_ERROR', details)


class QuotaExceededError(LLMError):
    """Quota exceeded error"""
    
    def __init__(self, message: str, provider: LLMProviderName, details: Optional[Any] = None):
        super().__init__(message, provider, 'QUOTA_EXCEEDED_ERROR', details)
