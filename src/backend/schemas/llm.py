"""
LLM API schemas.

Request and response models for LLM API endpoints including:
- Chat (regular, streaming, async)
- Structured output chat
- Content types and input models
"""

from typing import Union, Literal, Optional
from pydantic import BaseModel, Field


# Content Models
class TextContent(BaseModel):
    type: Literal["text"] = "text"
    text: str


class ImageContent(BaseModel):
    type: Literal["image"] = "image"
    data: str = Field(..., description="Base64-encoded image (no data URI prefix)")
    mime_type: Literal["image/png", "image/jpeg", "image/webp"] = "image/png"
    name: Optional[str] = None


InputContent = Union[TextContent, ImageContent]

ContentType = Literal['explanation', 'summary', 'answer', 'analysis', 'code', 'table', 'list']


# Chat Request/Response Models
class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    thread_id: str
    contents: list[InputContent] = Field(
        ...,
        description="Ordered list of text and image inputs"
    )
    system_message: Optional[str] = Field(
        default="You are a helpful assistant."
    )
    # RAG filter fields
    user_id: Optional[str] = Field(default=None, description="User ID for filtering documents")
    source_ids: Optional[list[str]] = Field(default=None, description="List of source/document IDs to search within")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description='LLM response message')

class StreamChatRequest(BaseModel):
    """Request model for streaming chat endpoint"""
    contents: list[InputContent]
    system_message: Optional[str] = Field(
        default="You are a helpful assistant. Always respond with well-structured markdown content."
    )
    expected_content_type: Optional[ContentType] = None


# Structured Output Models
class CodeBlock(BaseModel):
    """Model for code block in structured output"""
    language: str = Field(..., description='Programming language')
    code: str = Field(..., description='Code content')
    explanation: Optional[str] = Field(default=None, description='Optional explanation of the code')


class MathExpression(BaseModel):
    """Model for LaTeX math expression in structured output"""
    latex: str = Field(..., description='LaTeX expression')
    description: Optional[str] = Field(default=None, description='Plain text description of the expression')
    is_block: bool = Field(default=False, description='Whether this is a block (display) or inline expression')


class Section(BaseModel):
    """Model for content section in structured output"""
    heading: str = Field(..., description='Section heading')
    content: str = Field(..., description='Section content in markdown format')


class LLMStructuredOutput(BaseModel):
    """
    Structured output model for LLM responses.

    Ensures consistent, parseable output with markdown, LaTeX, and GFM support.
    The LLM is instructed to return responses conforming to this schema.
    """
    content: str = Field(..., description='Main content in markdown format with LaTeX and GFM support')
    content_type: ContentType = Field(..., description='Type of content being returned')
    title: Optional[str] = Field(default=None, description='Optional title for the response')
    sections: Optional[list[Section]] = Field(default=None, description='Optional breakdown into sections')
    key_points: Optional[list[str]] = Field(default=None, description='Key takeaways or bullet points')
    code_blocks: Optional[list[CodeBlock]] = Field(default=None, description='Extracted code blocks if any')
    math_expressions: Optional[list[MathExpression]] = Field(default=None, description='Extracted LaTeX math expressions if any')
    references: Optional[list[str]] = Field(default=None, description='References or sources if applicable')
    suggested_followups: Optional[list[str]] = Field(default=None, description='Suggested follow-up questions')


class StructuredChatRequest(BaseModel):
    """Request model for structured chat endpoint"""
    contents: list[InputContent]
    system_message: Optional[str] = Field(
        default='You are a helpful assistant. Always respond with well-structured markdown content.',
        description='System message to set the assistant behavior'
    )
    expected_content_type: Optional[ContentType] = None


class StructuredChatResponse(BaseModel):
    """Response model for structured chat endpoint"""
    structured_output: LLMStructuredOutput = Field(..., description='Structured LLM response')
    usage: Optional[dict] = Field(default=None, description='Token usage information if available')
