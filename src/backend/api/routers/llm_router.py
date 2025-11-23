"""
LLM API router
"""
import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from ..models.request_models import (
    ChatRequest, ImageAnalysisRequest, TableOfContentsRequest,
    StreamChunk, ErrorResponse, HealthResponse, ProviderInfo
)
from ...dependencies import dependencies
from src.backend.services.llm_service import LLMService
from src.backend.services.llm_service import TextContent, ImageContent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])


def get_llm_service() -> LLMService:
    """Dependency to get LLM service"""
    # This will be injected by the dependency system
    return dependencies.get('llm_service')


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """Stream chat response using SSE"""
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for chunk in llm_service.stream_chat(
                message=request.message,
                images=request.images,
                context=request.context
            ):
                chunk_data = StreamChunk(**chunk)
                yield f"data: {chunk_data.json()}\n\n"
            
            # Send final event
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in chat stream: {e}")
            error_data = ErrorResponse(
                error=str(e),
                detail="Failed to process chat request"
            )
            yield f"data: {error_data.json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.post("/chat")
async def chat(
    request: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """Non-streaming chat endpoint"""
    try:
        if request.images:
            inputs = [ImageContent(content=request.message, format='url', mime_type='image/jpeg')]
            for image in request.images:
                inputs.append(ImageContent(
                    content=image,
                    format='url',
                    mime_type='image/jpeg'
                ))
            response = await llm_service.process(inputs)
        else:
            response = await llm_service.process_text(request.message, request.context)      
        return {
            "content": response.content,
            "provider": response.provider,
            "model": response.model,
            "usage": response.usage,
            "metadata": response.metadata
        }
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-image")
async def analyze_image(
    request: ImageAnalysisRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """Analyze image endpoint"""
    try:
        inputs = [ImageContent(
            content=request.image_url,
            format='url',
            mime_type='image/jpeg'
        )]
        
        if request.prompt:
            inputs.insert(0, ImageContent(content=request.prompt, format='url', mime_type='image/jpeg'))
        
        response = await llm_service.process(inputs)
        
        return {
            "content": response.content,
            "provider": response.provider,
            "model": response.model,
            "usage": response.usage,
            "metadata": response.metadata
        }
        
    except Exception as e:
        logger.error(f"Error in image analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-toc")
async def generate_table_of_contents(
    request: TableOfContentsRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """Generate table of contents endpoint"""
    try:
        prompt = f"""Please analyze the following PDF content and generate a comprehensive table of contents in Markdown format. Focus on the main sections, subsections, and key topics covered in the document.

PDF Content:
{request.pdf_content}

Please provide a well-structured table of contents that would help someone navigate this document effectively."""
        
        response = await llm_service.process_text(prompt, request.context)
        
        return {
            "content": response.content,
            "provider": response.provider,
            "model": response.model,
            "usage": response.usage,
            "metadata": response.metadata
        }
        
    except Exception as e:
        logger.error(f"Error in TOC generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check(
    llm_service: LLMService = Depends(get_llm_service)
):
    """Health check endpoint"""
    try:
        status = await llm_service.get_status()
        
        return HealthResponse(
            status="healthy",
            service="llm-backend",
            version="1.0.0",
            providers=status.get('health', {})
        )
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return HealthResponse(
            status="unhealthy",
            service="llm-backend",
            version="1.0.0"
        )


@router.get("/providers")
async def get_providers(
    llm_service: LLMService = Depends(get_llm_service)
):
    """Get available providers"""
    try:
        status = await llm_service.get_status()
        providers = []
        
        for provider_name in status.get('providers', []):
            is_healthy = status.get('health', {}).get(provider_name, False)
            providers.append(ProviderInfo(
                name=provider_name,
                enabled=True,  # All registered providers are enabled
                healthy=is_healthy
            ))
        
        return {"providers": providers}
        
    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))
