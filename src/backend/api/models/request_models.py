"""
Request and response models for LLM API endpoints
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., description='User message to send to LLM')
    system_message: Optional[str] = Field(
        default='You are a helpful assistant.',
        description='System message to set the assistant behavior'
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description='LLM response message')
    usage: Optional[dict] = Field(default=None, description='Token usage information if available')


class StreamChatRequest(BaseModel):
    """Request model for streaming chat endpoint"""
    message: str = Field(..., description='User message to send to LLM')
    system_message: Optional[str] = Field(
        default='You are a helpful assistant.',
        description='System message to set the assistant behavior'
    )


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


ContentType = Literal['explanation', 'summary', 'answer', 'analysis', 'code', 'table', 'list']


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
    message: str = Field(..., description='User message to send to LLM')
    system_message: Optional[str] = Field(
        default='You are a helpful assistant. Always respond with well-structured markdown content.',
        description='System message to set the assistant behavior'
    )
    expected_content_type: Optional[ContentType] = Field(
        default=None,
        description='Hint for the expected type of response'
    )


class StructuredChatResponse(BaseModel):
    """Response model for structured chat endpoint"""
    structured_output: LLMStructuredOutput = Field(..., description='Structured LLM response')
    usage: Optional[dict] = Field(default=None, description='Token usage information if available')
