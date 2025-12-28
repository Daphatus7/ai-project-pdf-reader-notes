"""
API Request/Response schemas.

This module contains Pydantic models for API endpoints across different versions.
Schemas are organized by feature domain (auth, llm, users, etc.).
"""

from .auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

from .llm import (
    TextContent,
    ImageContent,
    InputContent,
    ContentType,
    ChatRequest,
    ChatResponse,
    StreamChatRequest,
    CodeBlock,
    MathExpression,
    Section,
    LLMStructuredOutput,
    StructuredChatRequest,
    StructuredChatResponse,
)

from .users import (
    UserProfile,
    UpdateUserRequest,
)

__all__ = [
    # Auth schemas
    'LoginRequest',
    'RegisterRequest',
    'TokenResponse',
    'UserResponse',
    # LLM schemas
    'TextContent',
    'ImageContent',
    'InputContent',
    'ContentType',
    'ChatRequest',
    'ChatResponse',
    'StreamChatRequest',
    'CodeBlock',
    'MathExpression',
    'Section',
    'LLMStructuredOutput',
    'StructuredChatRequest',
    'StructuredChatResponse',
    # User schemas
    'UserProfile',
    'UpdateUserRequest',
]
