"""
LLM API endpoints for chat functionality.

Provides endpoints for:
- Regular chat (sync and async)
- Streaming chat
- Structured output chat (enforces schema-conformant responses)
"""
import logging
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.backend.schemas import (
    ChatRequest,
    ChatResponse,
)

from src.backend.api.deps import get_llm_service, get_user, get_database_service, get_chat_request
from src.backend.schemas.chat.llm import ListThreadsResponse, DeleteThreadResponse, LoadThreadResponse, \
    ListThreadsRequest, DeleteThreadRequest, LoadThreadRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/llm', tags=['llm'])

@router.post('/chat', response_model=ChatResponse)
async def chat(
        request: ChatRequest = Depends(get_chat_request),
        llm_service=Depends(get_llm_service)
):
    response = llm_service.chat(request=request)
    return ChatResponse(response=response)


@router.post('/achat')
async def achat(
        request: ChatRequest = Depends(get_chat_request),
        llm_service=Depends(get_llm_service)
):
    """
    Streaming structured chat endpoint.
    """
    return StreamingResponse(
        llm_service.achat(request),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    )

#create a thread
@router.post('/thread', response_model=LoadThreadResponse)
async def create_conversation_thread(
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Create a new conversation thread.
    """
    user_id = user["sub"]  # Supabase user id
    response = await database_service.create_conversation_thread(
        user_id=user_id,
    )
    return response

# Get all conversation threads - use for loading previous conversations 
@router.get('/thread/list', response_model=ListThreadsResponse)
async def list_conversation_threads(
        request: ListThreadsRequest = Depends(),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
        Get all conversation threads for the user.
    """
    user_id = user["sub"]  # Supabase user id
    threads = await database_service.list_conversation_threads(user_id, request)
    return threads

# Delete a conversation thread
@router.delete('/thread', response_model=DeleteThreadResponse)
async def delete_conversation_thread(
        request: DeleteThreadRequest,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Delete a conversation thread.
    """
    user_id = user["sub"]
    return await database_service.delete_conversation_thread(
        user_id=user_id,
        request=request,
    )

@router.post('/thread/load', response_model=LoadThreadResponse)
async def load_conversation_thread(
        request: LoadThreadRequest,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Load all conversation history for the thread.
    """
    user_id = user["sub"]
    return await database_service.load_conversation_thread(
        user_id=user_id,
        request=request,
    )

