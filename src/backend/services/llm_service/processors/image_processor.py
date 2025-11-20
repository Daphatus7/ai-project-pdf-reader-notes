"""
Image processor for LLM inputs
Translated from TypeScript ImageProcessor.ts
"""
import base64
from ..types import ImageContent


class ImageProcessor:
    """Image input processor"""
    
    def preprocess(self, input_data: ImageContent) -> ImageContent:
        """Preprocess image input"""
        if input_data.type != 'image':
            raise ValueError('Input must be image type')
        
        # Basic image preprocessing
        processed_content = input_data.content
        
        # If it's a data URL, ensure it's properly formatted
        if input_data.format == 'base64' and not processed_content.startswith('data:'):
            # Add data URL prefix if missing
            mime_type = getattr(input_data, 'mime_type', 'image/jpeg')
            processed_content = f"data:{mime_type};base64,{processed_content}"
        
        # Create new input with processed content
        return ImageContent(
            content=processed_content,
            format=input_data.format,
            mime_type=getattr(input_data, 'mime_type', 'image/jpeg'),
            metadata=getattr(input_data, 'metadata', None)
        )
    
    def calculate_size(self, input_data: ImageContent) -> int:
        """Calculate image size in bytes"""
        if input_data.type != 'image':
            raise ValueError('Input must be image type')
        
        if input_data.format == 'base64':
            # Remove data URL prefix if present
            content = input_data.content
            if content.startswith('data:'):
                content = content.split(',', 1)[1]
            
            # Calculate size from base64
            return len(content) * 3 // 4  # Base64 to bytes conversion
        
        # For URL format, we can't easily calculate size
        # Return metadata size if available
        metadata = getattr(input_data, 'metadata', None)
        if metadata and 'size' in metadata:
            return metadata['size']
        
        return 0
