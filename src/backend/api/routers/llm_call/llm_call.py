"""
LLM API endpoints for chat functionality
"""
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain.messages import SystemMessage, HumanMessage

from servers import services
from ...models.request_models import ChatRequest, ChatResponse, StreamChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/llm', tags=['llm'])


def get_llm_service():
    """Dependency to get LLM service"""
    try:
        return services.get('llm_service')
    except ValueError as e:
        logger.error(f'Failed to get LLM service: {e}')
        raise HTTPException(status_code=503, detail='LLM service not available')


@router.post('/chat', response_model=ChatResponse)
async def chat(request: ChatRequest, llm_service=Depends(get_llm_service)):
    """
    Simple chat endpoint for synchronous LLM interaction.
    
    This endpoint accepts a user message and optional system message,
    and returns the LLM's response. Easy to debug via API calls.
    """
    try:
        system_msg = SystemMessage(content=request.system_message)
        human_msg = HumanMessage(content=request.message)
        
        response = llm_service.chat(
            system_message=system_msg,
            human_message=human_msg
        )
        
        response_text = getattr(response, 'content', str(response))
        
        usage = None
        try:
            usage = llm_service.get_usage()
        except Exception:
            pass
        
        return ChatResponse(
            response=response_text,
            usage=usage
        )
    except Exception as e:
        logger.error(f'Error in chat endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing chat request: {str(e)}')


@router.post('/chat/stream')
async def stream_chat(request: StreamChatRequest, llm_service=Depends(get_llm_service)):
    """
    Streaming chat endpoint for real-time LLM interaction.
    
    This endpoint accepts a user message and optional system message,
    and streams the LLM's response as it's generated.
    """
    try:
        system_msg = SystemMessage(content=request.system_message)
        human_msg = HumanMessage(content=request.message)
        
        async def generate_stream() -> AsyncGenerator[str, None]:
            try:
                async for chunk in llm_service.multi_thread_stream_chat(
                    system_message=system_msg,
                    human_message=human_msg
                ):
                    text = getattr(chunk, 'content', str(chunk))
                    yield f'data: {text}\n\n'
            except Exception as e:
                logger.error(f'Error in stream generation: {e}', exc_info=True)
                yield f'data: [ERROR] {str(e)}\n\n'
        
        return StreamingResponse(
            generate_stream(),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        )
    except Exception as e:
        logger.error(f'Error in stream_chat endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing streaming chat request: {str(e)}')


@router.post('/chat/async', response_model=ChatResponse)
async def async_chat(request: ChatRequest, llm_service=Depends(get_llm_service)):
    """
    Async chat endpoint for non-blocking LLM interaction.
    
    This endpoint accepts a user message and optional system message,
    and returns the LLM's response asynchronously.
    """
    try:
        system_msg = SystemMessage(content=request.system_message)
        human_msg = HumanMessage(content=request.message)
        
        response = await llm_service.multi_thread_chat(
            system_message=system_msg,
            human_message=human_msg
        )
        
        response_text = getattr(response, 'content', str(response))
        
        usage = None
        try:
            usage = llm_service.get_usage()
        except Exception:
            pass
        
        return ChatResponse(
            response=response_text,
            usage=usage
        )
    except Exception as e:
        logger.error(f'Error in async_chat endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing async chat request: {str(e)}')
