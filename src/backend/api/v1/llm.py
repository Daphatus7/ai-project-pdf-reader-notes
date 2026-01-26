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

from src.backend.api.deps import get_llm_service, get_user, get_database_service
from src.backend.schemas.chat.llm import GetThreadsResponse, DeleteThreadResponse, LoadThreadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/llm', tags=['llm'])

@router.post('/chat', response_model=ChatResponse)
async def chat(
        payload: ChatRequest,
        user=Depends(get_user),
        llm_service = Depends(get_llm_service)
):
    response = llm_service.chat(user_id=user["sub"], request=payload)
    return ChatResponse(response=response)


@router.post('/achat', response_model=StreamingResponse)
async def achat(
                payload: ChatRequest,
                user=Depends(get_user),
                llm_service=Depends(get_llm_service)):
    """
    Streaming structured chat endpoint.
    """

    # todo workflow 
    #  api -> 
    #  verification(reject if not qualified) -> 
    #  service provider (I want to use this service) -> 
    #  api service

    # todo: verify authentication and rate limiting

    # todo: validate request

    return StreamingResponse(
        llm_service.achat(payload),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    )

# Get all conversation threads - use for loading previous conversations 
@router.get('/threads', response_model=GetThreadsResponse)
async def get_conversation_threads(
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Get all conversation threads for the user.
    """
    user_id = user["sub"]  # Supabase user id
    threads = await database_service.get_conversation_threads(user_id=user_id)
    return threads

# Delete a conversation thread
@router.delete('/threads/{thread_id}', response_model=DeleteThreadResponse)
async def delete_conversation_thread(
        thread_id: str,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Delete a conversation thread.
    """
    user_id = user["sub"]  # Supabase user id
    response=await database_service.delete_conversation_thread(
        user_id=user_id,
        thread_id=thread_id,
    )
    return response

# load a conversation thread
@router.get('/threads/{thread_id}', response_model=LoadThreadResponse)
async def load_conversation_thread(
        thread_id: str,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Load a conversation thread.
    """
    user_id = user["sub"]  # Supabase user id
    response = await database_service.load_conversation_thread(
        user_id=user_id,
        thread_id=thread_id,
    )
    return response
#create a thread
@router.post('/threads', response_model=LoadThreadResponse)
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

