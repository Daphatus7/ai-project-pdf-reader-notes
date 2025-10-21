"""
Multimodal coordinator for LLM processing
Translated from TypeScript MultimodalCoordinator.ts
"""
from typing import List, Dict, Any
from .types import InputContent, UnifiedInput, LLMResponse, Modality, LLMError
from .routing.router import LLMRouter
from .processors.text_processor import TextProcessor
from .processors.image_processor import ImageProcessor
from .processors.audio_processor import AudioProcessor


class ProcessedInput:
    """Processed input data"""
    
    def __init__(self, content: Any, modality: Modality, size: int):
        self.content = content
        self.modality = modality
        self.size = size


class MultimodalCoordinator:
    """Multimodal coordinator for LLM processing"""
    
    def __init__(self, router: LLMRouter):
        self.text_processor = TextProcessor()
        self.image_processor = ImageProcessor()
        self.audio_processor = AudioProcessor()
        self.router = router
    
    async def process_mixed_input(self, inputs: List[InputContent]) -> UnifiedInput:
        """Process mixed input types"""
        if not inputs:
            raise LLMError('No input provided', 'openai')
        
        processed_inputs = await self._process_inputs(inputs)
        return self._merge_inputs(processed_inputs)
    
    async def process_single_input(self, input_data: InputContent) -> UnifiedInput:
        """Process single input"""
        processed_input = await self._process_input(input_data)
        return self._merge_inputs([processed_input])
    
    async def coordinate_processing(self, inputs: List[InputContent]) -> LLMResponse:
        """Coordinate multimodal processing"""
        unified_input = await self.process_mixed_input(inputs)
        provider = self.router.select_provider(unified_input)
        
        return await provider.process(unified_input)
    
    async def _process_inputs(self, inputs: List[InputContent]) -> List[ProcessedInput]:
        """Process multiple inputs"""
        processed_inputs = []
        
        for input_data in inputs:
            processed = await self._process_input(input_data)
            processed_inputs.append(processed)
        
        return processed_inputs
    
    async def _process_input(self, input_data: InputContent) -> ProcessedInput:
        """Process single input"""
        if input_data.type == 'text':
            content = self.text_processor.preprocess(input_data)
            modality = 'text'
            size = self.text_processor.calculate_size(input_data)
        elif input_data.type == 'image':
            content = self.image_processor.preprocess(input_data)
            modality = 'image'
            size = self.image_processor.calculate_size(input_data)
        elif input_data.type == 'audio':
            content = self.audio_processor.preprocess(input_data)
            modality = 'audio'
            size = self.audio_processor.calculate_size(input_data)
        else:
            raise LLMError(f'Unsupported input type: {input_data.type}', 'openai')
        
        return ProcessedInput(content, modality, size)
    
    def _merge_inputs(self, processed_inputs: List[ProcessedInput]) -> UnifiedInput:
        """Merge processed inputs into unified format"""
        unified_input = UnifiedInput(
            metadata={
                'total_size': 0,
                'modalities': [],
                'max_tokens': 1000
            }
        )
        
        for processed in processed_inputs:
            unified_input.metadata['total_size'] += processed.size
            unified_input.metadata['modalities'].append(processed.modality)
            
            if processed.modality == 'text':
                unified_input.text = processed.content.content
            elif processed.modality == 'image':
                if not unified_input.images:
                    unified_input.images = []
                unified_input.images.append(processed.content)
            elif processed.modality == 'audio':
                if not unified_input.audio:
                    unified_input.audio = []
                unified_input.audio.append(processed.content)
        
        return unified_input
    
    def validate_input_combination(self, inputs: List[InputContent]) -> bool:
        """Validate input combination"""
        modalities = [input_data.type for input_data in inputs]
        unique_modalities = list(set(modalities))
        
        # Check if combination is valid
        if 'audio' in unique_modalities and 'image' in unique_modalities:
            # Audio + Image combination may need special handling
            return self._validate_audio_image_combination(inputs)
        
        return True
    
    def _validate_audio_image_combination(self, inputs: List[InputContent]) -> bool:
        """Validate audio + image combination"""
        # Most LLMs don't support simultaneous audio and image processing
        # This is a placeholder for specific validation logic
        print('Warning: Audio + Image combination may not be supported by all providers')
        return True
    
    def get_supported_modality_combinations(self) -> List[List[Modality]]:
        """Get supported modality combinations"""
        return [
            ['text'],
            ['image'],
            ['audio'],
            ['text', 'image'],
            ['text', 'audio']
            # Note: ['image', 'audio'] is not included as most providers don't support it
        ]
    
    async def estimate_processing_cost(self, inputs: List[InputContent]) -> float:
        """Estimate processing cost"""
        unified_input = await self.process_mixed_input(inputs)
        provider = self.router.select_provider(unified_input)
        
        return await provider.estimate_cost(unified_input)
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return {
            'supported_modalities': ['text', 'image', 'audio'],
            'supported_combinations': self.get_supported_modality_combinations(),
            'available_providers': [p.name for p in self.router.get_providers()]
        }
