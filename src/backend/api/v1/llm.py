"""
LLM API endpoints for chat functionality.

Provides endpoints for:
- Regular chat (sync and async)
- Streaming chat
- Structured output chat (enforces schema-conformant responses)
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.backend.schemas import (
    ChatRequest,
    ChatResponse,
)

from src.backend.api.deps import get_llm_service, get_user, get_database_service, get_chat_request, get_concurrency_limiter
from src.backend.schemas.error import AppError
from src.backend.services.concurrency_limiter import ConcurrencyLimiter
from src.backend.schemas.chat.llm import ListThreadsResponse, DeleteThreadResponse, LoadThreadResponse, \
    DeleteThreadRequest, LoadThreadRequest, CreateThreadResponse, ThreadInfo

router = APIRouter(prefix='/llm', tags=['llm'])

@router.post('/chat', response_model=ChatResponse)
async def chat(
        request: ChatRequest = Depends(get_chat_request),
        llm_service=Depends(get_llm_service),
        database_service=Depends(get_database_service),
        concurrency_limiter: ConcurrencyLimiter = Depends(get_concurrency_limiter),
):
    user_id = request.user_id

    # Enforce per-user token budget before consuming a concurrency slot
    await database_service.enforce_token_quota(user_id)

    # Reject the 4th simultaneous request from the same user
    if not concurrency_limiter.acquire(user_id):
        raise AppError(429, "CONCURRENT_LIMIT", "Too many concurrent requests")

    try:
        response = await llm_service.chat(request=request)
        await database_service.track_token_usage(user_id, response.total_tokens)
        return response
    finally:
        # Always release the slot — success, error, or cancellation
        concurrency_limiter.release(user_id)

@router.post('/chat/stream')
async def chat_stream(
        request: ChatRequest = Depends(get_chat_request),
        llm_service=Depends(get_llm_service),
        database_service=Depends(get_database_service),
        concurrency_limiter: ConcurrencyLimiter = Depends(get_concurrency_limiter),
):
    user_id = request.user_id
    await database_service.enforce_token_quota(user_id)

    if not concurrency_limiter.acquire(user_id):
        raise AppError(429, "CONCURRENT_LIMIT", "Too many concurrent requests")

    async def stream_with_release():
        try:
            async for chunk in llm_service.chat_stream(request=request):
                yield chunk
        finally:
            concurrency_limiter.release(user_id)

    return StreamingResponse(
        stream_with_release(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


#create a thread
@router.post('/thread', response_model=CreateThreadResponse)
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
    return CreateThreadResponse(**response)

# Get all conversation threads - use for loading previous conversations 
@router.get('/thread/list', response_model=ListThreadsResponse)
async def list_conversation_threads(
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
        Get all conversation threads for the user.
    """
    user_id = user["sub"]  # Supabase user id
    threads = await database_service.list_conversation_threads(user_id)
    return ListThreadsResponse(threads=
        [
            ThreadInfo(
                thread_id=thread["id"],
                title=thread["title"],
                thread_summary=thread["thread_summary"],
                created_at=thread["created_at"],
                updated_at=thread["updated_at"]
            ) for thread in threads
        ]
    )

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
    messages = await database_service.load_conversation_thread(
        user_id=user_id,
        request=request,
    )
    return LoadThreadResponse(
        thread_id=request.thread_id,
        messages=messages)

