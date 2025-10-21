"""
Text processor for LLM inputs
Translated from TypeScript TextProcessor.ts
"""
from ..types import TextContent


class TextProcessor:
    """Text input processor"""
    
    def preprocess(self, input_data: TextContent) -> TextContent:
        """Preprocess text input"""
        if input_data.type != 'text':
            raise ValueError('Input must be text type')
        
        # Basic text preprocessing
        processed_content = input_data.content.strip()
        
        # Create new input with processed content
        return TextContent(
            content=processed_content,
            language=getattr(input_data, 'language', None)
        )
    
    def calculate_size(self, input_data: TextContent) -> int:
        """Calculate text size in bytes"""
        if input_data.type != 'text':
            raise ValueError('Input must be text type')
        
        return len(input_data.content.encode('utf-8'))
