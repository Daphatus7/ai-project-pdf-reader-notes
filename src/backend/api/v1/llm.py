"""
LLM API endpoints for chat functionality.

Provides endpoints for:
- Regular chat (sync and async)
- Streaming chat
- Structured output chat (enforces schema-conformant responses)
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from langchain.messages import SystemMessage, HumanMessage
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import json

from src.backend.auth.server_auth import verify_user_is_allowed
from src.backend.schemas import (
    ChatRequest,
    ChatResponse,
    StructuredChatRequest,
    StructuredChatResponse,
)

from src.backend.api.deps import get_llm_service
from src.backend.schemas.auth import UserRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/llm', tags=['llm'])


@router.post('/chat', response_model=ChatResponse)
async def chat(request: ChatRequest, llm_service=Depends(get_llm_service)):
    """
    Simple chat endpoint for synchronous LLM interaction.

    This endpoint accepts a user message and optional system message,
    and returns the LLM's response. Easy to debug via API calls.
    """
    
    #todo verify authentication and rate limiting
    
    #todo send the request to the llm service

    response = llm_service.chat_v2(request)  # just to verify the request is valid
    logger.info(
        f'Chat request processed successfully.'
    )
    return ChatResponse(response=response)

@router.post('/chat_v2', response_model=ChatResponse)
async def chat_v2(
        payload: ChatRequest,
        _: UserRequest = Depends(verify_user_is_allowed),
        llm_service = Depends(get_llm_service)
):
    response = llm_service.chat_v2(payload)
    return ChatResponse(response=response)



@router.post('/chat/structured/stream')
async def structured_stream_chat(chat_request: ChatRequest,
                                 # use_request: UserRequest = Depends(verify_user_is_allowed),
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
        llm_service.achat(chat_request),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    )
