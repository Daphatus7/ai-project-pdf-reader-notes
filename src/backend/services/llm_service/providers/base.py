"""
Base LLM provider abstract class
Translated from TypeScript LLMProvider.ts
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from ..types import (
    UnifiedInput, LLMResponse, LLMProviderName, ProviderCapabilities,
    LLMError, Modality
)


class LLMProvider(ABC):
    """Abstract LLM provider interface"""
    
    @property
    @abstractmethod
    def name(self) -> LLMProviderName:
        """Provider name"""
        pass
    
    @property
    @abstractmethod
    def capabilities(self) -> ProviderCapabilities:
        """Provider capabilities"""
        pass
    
    @abstractmethod
    async def process(self, input_data: UnifiedInput) -> LLMResponse:
        """Process unified input"""
        pass
    
    def can_handle(self, input_data: UnifiedInput) -> bool:
        """Check if provider can handle the input"""
        try:
            self.validate_input(input_data)
            return True
        except Exception:
            return False
    
    def get_capabilities(self) -> ProviderCapabilities:
        """Get provider capabilities"""
        return self.capabilities
    
    def validate_input(self, input_data: UnifiedInput) -> None:
        """Validate input"""
        # Check input size
        if input_data.metadata.get('total_size', 0) > self.capabilities.max_input_size:
            raise LLMError(
                f"Input size {input_data.metadata.get('total_size', 0)} exceeds maximum {self.capabilities.max_input_size}",
                self.name
            )
        
        # Check modality support
        modalities = input_data.metadata.get('modalities', [])
        for modality in modalities:
            if modality not in self.capabilities.supported_modalities:
                raise LLMError(
                    f"Provider {self.name} does not support modality: {modality}",
                    self.name
                )
        
        # Check image size
        if input_data.images:
            for image in input_data.images:
                image_size = self._calculate_image_size(image)
                if image_size > self.capabilities.max_image_size:
                    raise LLMError(
                        f"Image size {image_size} exceeds maximum {self.capabilities.max_image_size}",
                        self.name
                    )
        
        # Check audio size
        if input_data.audio:
            for audio in input_data.audio:
                audio_size = self._calculate_audio_size(audio)
                if audio_size > self.capabilities.max_audio_size:
                    raise LLMError(
                        f"Audio size {audio_size} exceeds maximum {self.capabilities.max_audio_size}",
                        self.name
                    )
    
    async def estimate_cost(self, input_data: UnifiedInput) -> float:
        """Estimate processing cost"""
        if not self.capabilities.cost_per_token:
            return 0.0
        
        # Simple cost estimation based on input size and estimated output
        input_tokens = self._estimate_tokens(input_data)
        output_tokens = input_data.metadata.get('max_tokens', 1000)
        total_tokens = input_tokens + output_tokens
        
        return total_tokens * self.capabilities.cost_per_token
    
    async def health_check(self) -> bool:
        """Health check"""
        try:
            # Send a simple test request
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
    
    def _calculate_image_size(self, image) -> int:
        """Calculate image size in bytes"""
        if image.format == 'base64':
            # Remove data URL prefix if present
            content = image.content
            if content.startswith('data:'):
                content = content.split(',', 1)[1]
            return len(content) * 3 // 4  # Base64 to bytes conversion
        return image.metadata.get('size', 0) if image.metadata else 0
    
    def _calculate_audio_size(self, audio) -> int:
        """Calculate audio size in bytes"""
        if audio.format == 'base64':
            # Remove data URL prefix if present
            content = audio.content
            if content.startswith('data:'):
                content = content.split(',', 1)[1]
            return len(content) * 3 // 4  # Base64 to bytes conversion
        return audio.metadata.get('size', 0) if audio.metadata else 0
    
    def _estimate_tokens(self, input_data: UnifiedInput) -> int:
        """Estimate token count"""
        tokens = 0
        
        # Text tokens estimation (rough: 1 token ≈ 4 characters)
        if input_data.text:
            tokens += len(input_data.text) // 4
        
        # Image tokens estimation (rough: ~1000 tokens per image)
        if input_data.images:
            tokens += len(input_data.images) * 1000
        
        # Audio tokens estimation (rough: ~100 tokens per second)
        if input_data.audio:
            for audio in input_data.audio:
                duration = audio.duration or 10  # Default 10 seconds
                tokens += int(duration * 100)
        
        return tokens
