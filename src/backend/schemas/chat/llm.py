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
    """Request model for chat endpoint
        A stateless design model.
        Gather all needed context for the api call.
        project_id: the users project id
    """
    user_id: str  # the user's unique identifier
    project_id: str #the user's project_id or folder id
    thread_id: str# conversation thread for the user
    # users query and any context send by the user
    contents: list[InputContent] = Field(
        ...,
        description="Ordered list of text and image inputs"
    )
    # RAG filter fields
    source_ids: Optional[list[str]] = Field(default=None, description="List of source/document IDs to search within")


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description='LLM response message')

class GetThreadsRequest(BaseModel):
    """Request model for fetching conversation threads"""
    project_id: str
    
class GetThreadsResponse(BaseModel):
    """Response model for fetching conversation threads"""
    threads: list[dict]  # List of thread details
    # ToDO data structure to be improved later

class DeleteThreadRequest(BaseModel):
    """Request model for deleting a conversation thread"""
    thread_id: str
    
class DeleteThreadResponse(BaseModel):
    """Response model for deleting a conversation thread"""
    response: str  # keep it simple for now
    
class LoadThreadRequest(BaseModel):
    """Request model for loading a conversation thread"""
    thread_id: str

class LoadThreadResponse(BaseModel):
    """Response model for loading a conversation thread"""
    thread_id: str
    messages: list[dict] # to be enhanced in the future
    # ToDO data structure to be improved later