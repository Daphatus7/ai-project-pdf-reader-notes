"""
Shared API dependencies.

Provides common dependencies used across API endpoints:
- Service dependencies (LLM, database, etc.)
- Authentication and authorization
- Request validation
"""
import logging
import os
from typing import Optional

import jwt
from fastapi import HTTPException,  Header

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

def get_rag_service():
    """
    
    :return: 
    """
    try:
        return services.get('rag_service')
    except ValueError as e:
        logger.error(f'Failed to get Rag service: {e}')
        raise HTTPException(status_code=503, detail='Rag service not available')

def get_database_service():
    """
    
    :return: 
    """
    try:
        return services.get('database_service')
    except ValueError as e:
        logger.error(f'Failed to get database service: {e}')
        raise HTTPException(status_code=503, detail='database service not available')


# Authentication Dependency
async def get_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            os.environ.get("SUPABASE_JWT_SECRET"),
            algorithms=["HS256"],
            audience="authenticated"
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    print(payload) # todo debug testing, remove in production
    return payload  # 包含 user_id / email / role

