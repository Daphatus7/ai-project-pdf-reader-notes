"""
Request and response models for LLM API endpoints
"""
from typing import Optional
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
