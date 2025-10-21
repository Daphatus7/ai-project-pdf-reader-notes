"""
Audio processor for LLM inputs
Translated from TypeScript AudioProcessor.ts
"""
import base64
from ..types import AudioContent


class AudioProcessor:
    """Audio input processor"""
    
    def preprocess(self, input_data: AudioContent) -> AudioContent:
        """Preprocess audio input"""
        if input_data.type != 'audio':
            raise ValueError('Input must be audio type')
        
        # Basic audio preprocessing
        processed_content = input_data.content
        
        # If it's a data URL, ensure it's properly formatted
        if input_data.format == 'base64' and not processed_content.startswith('data:'):
            # Add data URL prefix if missing
            mime_type = getattr(input_data, 'mime_type', 'audio/mpeg')
            processed_content = f"data:{mime_type};base64,{processed_content}"
        
        # Create new input with processed content
        return AudioContent(
            content=processed_content,
            format=input_data.format,
            mime_type=getattr(input_data, 'mime_type', 'audio/mpeg'),
            duration=getattr(input_data, 'duration', None),
            metadata=getattr(input_data, 'metadata', None)
        )
    
    def calculate_size(self, input_data: AudioContent) -> int:
        """Calculate audio size in bytes"""
        if input_data.type != 'audio':
            raise ValueError('Input must be audio type')
        
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
