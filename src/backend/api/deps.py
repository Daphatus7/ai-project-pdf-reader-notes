"""
Shared API dependencies.

Provides common dependencies used across API endpoints:
- Service dependencies (LLM, database, etc.)
- Authentication and authorization
- Request validation
"""
import logging
from typing import Optional
from fastapi import HTTPException, Depends, Header

from src.backend.servers import services

logger = logging.getLogger(__name__)


def get_llm_service():
    """
    Dependency to get LLM service.

    Returns:
        LLM service instance

    Raises:
        HTTPException: If LLM service is not available
    """
    try:
        return services.get('llm_service')
    except ValueError as e:
        logger.error(f'Failed to get LLM service: {e}')
        raise HTTPException(status_code=503, detail='LLM service not available')


# Add more shared dependencies here as needed
# Example: Authentication dependency
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Get current authenticated user from Authorization header.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        User object if authenticated

    Raises:
        HTTPException: If authentication fails
    """
    # TODO: Implement authentication logic
    # For now, this is a placeholder
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Extract token and validate
    # Return user object
    pass


# Example: Database session dependency
async def get_db():
    """
    Get database session.

    Yields:
        Database session
    """
    # TODO: Implement database session management
    # This should use your database configuration
    pass
