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

from src.backend.auth.server_auth import verify_user_is_allowed
from src.backend.schemas import (
    ChatRequest,
    ChatResponse,
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
    
    llm_service.chat_v2(request)  # just to verify the request is valid
    # todo log the request
    return
    try:
        system_msg = SystemMessage(content=request.system_message)

        print("Request contents:", request.contents)


        # Build content array from contents
        content_parts = []
        for item in request.contents:
            if item.type == "text":
                content_parts.append({"type": "text", "text": item.text})
            elif item.type == "image":
                # Convert base64 to data URL format for LangChain
                data_url = f"data:{item.mime_type};base64,{item.data}"
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": data_url}
                })

        human_msg = HumanMessage(content=content_parts)

        response = llm_service.chat(
            system_message=system_msg,
            human_message=human_msg
        )

        response_text = getattr(response, 'content', str(response))

        return ChatResponse(
            response=response_text,
        )
    except Exception as e:
        logger.error(f'Error in chat endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing chat request: {str(e)}')

@router.post('/chat_v2', response_model=ChatResponse)
async def chat_v2(
        payload: ChatRequest,
        _: UserRequest = Depends(verify_user_is_allowed),
        llm_service = Depends(get_llm_service)
):
    response = llm_service.chat_v2(payload)
    return ChatResponse(response=response)

