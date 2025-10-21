"""
Pydantic request/response models for API
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    images: Optional[List[str]] = None
    context: Optional[str] = None
    provider: Optional[str] = None
    stream: bool = True


class ImageAnalysisRequest(BaseModel):
    """Image analysis request model"""
    image_url: str
    prompt: Optional[str] = None
    context: Optional[str] = None


class TableOfContentsRequest(BaseModel):
    """Table of contents request model"""
    pdf_content: str
    context: Optional[str] = None


class StreamChunk(BaseModel):
    """Stream response chunk model"""
    content: str
    done: bool
    metadata: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    service: str
    version: str
    providers: Optional[Dict[str, bool]] = None


class ProviderInfo(BaseModel):
    """Provider information model"""
    name: str
    enabled: bool
    healthy: bool
    capabilities: Optional[Dict[str, Any]] = None
