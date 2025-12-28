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

from servers import services
from src.backend.models.request_models import (
    ChatRequest,
    ChatResponse,
    StreamChatRequest,
    StructuredChatRequest,
    StructuredChatResponse,
    LLMStructuredOutput,
)

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


@router.post('/chat/stream')
async def stream_chat(request: StreamChatRequest, llm_service=Depends(get_llm_service)):
    """
    Streaming chat endpoint for real-time LLM interaction.
    
    This endpoint accepts a user message and optional system message,
    and streams the LLM's response as it's generated.
    """
    try:
        system_msg = SystemMessage(content=request.system_message)
        
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


@router.post('/chat/structured', response_model=StructuredChatResponse)
async def structured_chat(request: StructuredChatRequest, llm_service=Depends(get_llm_service)):
    """
    Structured chat endpoint that enforces schema-conformant LLM output.
    
    This endpoint ensures the LLM returns responses that conform to the
    LLMStructuredOutput schema, making it easier to parse and display
    markdown, LaTeX, and GFM content consistently.
    
    The response includes:
    - content: Main markdown content with LaTeX and GFM support
    - content_type: Type of response (explanation, summary, answer, etc.)
    - sections: Optional breakdown into sections
    - key_points: Key takeaways
    - code_blocks: Extracted code with language info
    - math_expressions: Extracted LaTeX expressions
    - suggested_followups: Suggested follow-up questions
    """
    try:
        # Build enhanced system message for structured output
        base_system = request.system_message or STRUCTURED_OUTPUT_SYSTEM_PROMPT
        
        content_type_hint = ''
        if request.expected_content_type:
            content_type_hint = f'\n\nExpected response type: {request.expected_content_type}'
        
        system_msg = SystemMessage(content=base_system + content_type_hint)
        
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
        
        structured_output = await llm_service.async_chat_with_structured_output(
            output_schema=LLMStructuredOutput,
            system_message=system_msg,
            human_message=human_msg
        )
        
        usage = None
        try:
            usage = llm_service.get_usage()
        except Exception:
            pass
        
        return StructuredChatResponse(
            structured_output=structured_output,
            usage=usage
        )
    except Exception as e:
        logger.error(f'Error in structured_chat endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing structured chat request: {str(e)}')


@router.post('/chat/structured/sync', response_model=StructuredChatResponse)
def structured_chat_sync(request: StructuredChatRequest, llm_service=Depends(get_llm_service)):
    """
    Synchronous structured chat endpoint for debugging and simple use cases.
    
    Same as /chat/structured but synchronous for easier debugging.
    """
    try:
        base_system = request.system_message or STRUCTURED_OUTPUT_SYSTEM_PROMPT
        
        content_type_hint = ''
        if request.expected_content_type:
            content_type_hint = f'\n\nExpected response type: {request.expected_content_type}'
        
        system_msg = SystemMessage(content=base_system + content_type_hint)
        
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
        
        structured_output = llm_service.chat_with_structured_output(
            output_schema=LLMStructuredOutput,
            system_message=system_msg,
            human_message=human_msg
        )
        
        usage = None
        try:
            usage = llm_service.get_usage()
        except Exception:
            pass
        
        return StructuredChatResponse(
            structured_output=structured_output,
            usage=usage
        )
    except Exception as e:
        logger.error(f'Error in structured_chat_sync endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing structured chat request: {str(e)}')


@router.post('/chat/structured/stream')
async def structured_stream_chat(request: StructuredChatRequest, llm_service=Depends(get_llm_service)):
    """
    Streaming structured chat endpoint that streams both text chunks and structured output updates.
    
    This endpoint streams the LLM response in real-time. The accumulated text is periodically
    parsed to generate structured output updates conforming to the LLMStructuredOutput schema.
    
    The stream sends two types of events:
    - 'text': Raw text chunks as they're generated (updates the content field)
    - 'structured': JSON updates of the structured output as it becomes available
    """
    import json
    
    try:
        base_system = request.system_message or STRUCTURED_OUTPUT_SYSTEM_PROMPT
        
        content_type_hint = ''
        if request.expected_content_type:
            content_type_hint = f'\n\nExpected response type: {request.expected_content_type}'
        
        system_msg = SystemMessage(content=base_system + content_type_hint)
        
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
        
        async def generate_stream() -> AsyncGenerator[str, None]:
            accumulated_text = ''
            last_structured_update = None
            chunk_count = 0
            
            try:
                # Stream raw text chunks
                async for chunk in llm_service.multi_thread_stream_chat(
                    system_message=system_msg,
                    human_message=human_msg
                ):
                    text = getattr(chunk, 'content', str(chunk))
                    accumulated_text += text
                    chunk_count += 1
                    
                    # Send text chunk
                    yield f'data: {json.dumps({"type": "text", "content": text})}\n\n'
                    
                    # Periodically send structured output updates with accumulated content
                    # (every 15 chunks or when we have substantial content)
                    if (chunk_count % 15 == 0 and len(accumulated_text) > 50) or len(accumulated_text) > 300:
                        # Create a minimal structured output with current content
                        # The full structured parsing will happen at the end
                        partial_output = {
                            'content': accumulated_text,
                            'content_type': 'answer'  # default, will be updated in final parse
                        }
                        
                        if partial_output != last_structured_update:
                            last_structured_update = partial_output
                            yield f'data: {json.dumps({"type": "structured", "data": partial_output})}\n\n'
                
                # Final structured output after streaming completes
                # Send the accumulated text as the final structured output
                # The content field is the main field that was streamed
                final_structured = {
                    'content': accumulated_text,
                    'content_type': 'answer'  # Default type
                }
                
                yield f'data: {json.dumps({"type": "structured", "data": final_structured})}\n\n'
                yield f'data: {json.dumps({"type": "done"})}\n\n'
                    
            except Exception as e:
                logger.error(f'Error in structured stream generation: {e}', exc_info=True)
                yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'
        
        return StreamingResponse(
            generate_stream(),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        )
    except Exception as e:
        logger.error(f'Error in structured_stream_chat endpoint: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Error processing streaming structured chat request: {str(e)}')
