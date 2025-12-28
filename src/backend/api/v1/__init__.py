"""
API v1 package.

Contains all version 1 API endpoints organized by resource:
- llm: LLM chat and structured output endpoints
- auth: Authentication and authorization endpoints
- users: User management endpoints
"""
from api.v1.router import router

__all__ = ['router']
