# @file        __init__.py
# @description 
# @author      [Peiyu Wang]
# @date        29/12/2025
# @license     © 2025 . All rights reserved.
"""
API Request/Response schemas.

This module contains Pydantic models for API endpoints across different versions.
Schemas are organized by feature domain (auth, llm, users, etc.).
"""

from src.backend.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    UserResponse,
)

from src.backend.schemas.chat.llm import (
    ImageOutput,
    ContentType,
    ChatRequest,
    ChatResponse,
    ListThreadsRequest,
    ListThreadsResponse,
    DeleteThreadRequest,
    DeleteThreadResponse,
    LoadThreadRequest,
    LoadThreadResponse,
)

from src.backend.schemas.users import (
    UserProfile,
)

__all__ = [
    # Auth schemas
    'LoginRequest',
    'RegisterRequest',
    'LoginResponse',
    'UserResponse',
    'ContentType',
    'ChatRequest',
    'ChatResponse',
    'ListThreadsRequest',
    'ListThreadsResponse',
    'DeleteThreadRequest',
    'DeleteThreadResponse',
    'LoadThreadRequest',
    'LoadThreadResponse',
    # User schemas
    'UserProfile',
]
