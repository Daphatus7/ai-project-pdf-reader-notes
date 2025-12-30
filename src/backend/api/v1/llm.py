"""
LLM API endpoints for chat functionality.

Provides endpoints for:
- Regular chat (sync and async)
- Streaming chat
- Structured output chat (enforces schema-conformant responses)
"""
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain.messages import SystemMessage, HumanMessage

from src.backend.auth.server_auth import verify_user_is_allowed
from src.backend.schemas import (
    ChatRequest,
    ChatResponse,
    StreamChatRequest,
    StructuredChatRequest,
    StructuredChatResponse,
    LLMStructuredOutput
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


@router.post('/chatv2', response_model=ChatResponse)
async def chat_v2(
        payload: ChatRequest,
        _: UserRequest = Depends(verify_user_is_allowed),
        llm_service = Depends(get_llm_service)
):
    response = llm_service.chat_v2(payload)
    return ChatResponse(response=response)

STRUCTURED_OUTPUT_SYSTEM_PROMPT = '''You are a helpful assistant that provides well-structured responses.

FORMAT YOUR RESPONSES USING PROPER MARKDOWN:

1. HEADERS: Use # ## ### for section organization

2. MATH EXPRESSIONS (CRITICAL - follow these rules EXACTLY):

   A) ALWAYS wrap ALL math in $...$ delimiters - no exceptions!
      - Variables: $P(t)$, $c_n$, $\\omega$, $T$
      - Equations: $P(t) = A\\cos(\\omega t)$
      - Subscripts/superscripts: $c_{-1}$, $e^{j\\omega t}$, $c_n^*$

   B) Use LaTeX commands, NEVER Unicode symbols:
      - WRONG: ∑, ∞, ω, π, ∫ (Unicode symbols)
      - CORRECT: $\\sum$, $\\infty$, $\\omega$, $\\pi$, $\\int$

   C) Display math: Use $$ on separate lines (NOT inside bullet points)

   WRONG examples (will NOT render):
   - P(t) = ∑_{n=-∞}^{∞} c_n e^{jnωt}
   - c_{-n} = c_n^*
   - cos(ωt) = (e^{jωt} + e^{-jωt})/2

   CORRECT examples (WILL render):
   - $P(t) = \\sum_{n=-\\infty}^{\\infty} c_n e^{jn\\omega t}$
   - $c_{-n} = c_n^*$
   - $\\cos(\\omega t) = (e^{j\\omega t} + e^{-j\\omega t})/2$

3. CODE BLOCKS: Use ```language

4. TABLES WITH MATH (CRITICAL):
   - All math in cells MUST use $...$ delimiters
   - For absolute value |x|, use $\\lvert x \\rvert$ NOT $|x|$ (pipe conflicts with table syntax)
   - Example: "Vanishing gradient for large $\\lvert x \\rvert$"

5. LISTS: Use - for bullets. Keep math inline with $...$

6. BLOCKQUOTES: Use > for notes

CRITICAL REMINDER: Every math expression must use $...$ delimiters. In tables, use \\lvert and \\rvert for absolute values instead of |.'''
