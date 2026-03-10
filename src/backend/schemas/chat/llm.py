"""
LLM API schemas.

Request and response models for LLM API endpoints including:
- Chat (regular, streaming, async)
- Structured output chat
- Content types and input models
"""

from typing import Union, Literal, Optional
from pydantic import BaseModel, Field



# Output Content Models (mirror input structure for API symmetry)


class ImageContent(BaseModel):
    """Image content for both user input and AI response"""
    type: Literal["image"] = "image"
    data: str = Field(..., description="Base64-encoded image (no data URI prefix)")
    mime_type: Literal["image/png", "image/jpeg", "image/webp"] = "image/png"
    name: Optional[str] = Field(default=None, description="Optional filename for display")


ContentType = Literal['explanation', 'summary', 'answer', 'analysis', 'code', 'table', 'list']


# Chat Request/Response Models
class ChatRequest(BaseModel):
    """Request model for chat endpoint
        A stateless design model.
        Gather all needed context for the api call.
        project_id: the users project id
    """
    user_id: Optional[str] = None      # injected by server from auth token
    project_id: Optional[str] = None   # used for RAG document filtering
    thread_id: str  # conversation thread for the user
    # users query and any context send by the user
    content: list[dict]
    # RAG filter fields
    source_ids: Optional[list[str]] = Field(default=None, description="List of source/document IDs to search within")

class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    id: str
    role: str
    content: list[dict] # create
    """
        example:
             contents=[{"type": "text",
                       "text": ai_msg.content}],

    """
    created_at: str
    total_tokens: int | None = None  # for usage tracking
    input_tokens: int = 0
    output_tokens: int = 0

# threads
class CreateThreadRequest(BaseModel):
    """Request model for creating a conversation thread"""

class CreateThreadResponse(BaseModel):
    """Response model for creating a conversation thread"""
    thread_id: str
    title: str
    thread_summary: Optional[str] = None

class ListThreadsRequest(BaseModel):
    """Request model for fetching conversation threads"""
    project_id: str

class ThreadInfo(BaseModel):
    thread_id: str
    title: str
    thread_summary: str
    created_at: str
    updated_at: str

class ListThreadsResponse(BaseModel):
    """Response model for fetching conversation threads"""
    threads: list[ThreadInfo]  # List of thread details
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
