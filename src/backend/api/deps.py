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
from jwt import PyJWKClient
from fastapi import HTTPException, Header

from src.backend.servers import services

logger = logging.getLogger(__name__)

# Initialize JWKS client for Supabase token verification
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> PyJWKClient:
    """Get or create the JWKS client for token verification."""
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.environ.get("SUPABASE_URL")
        if not supabase_url:
            raise ValueError("SUPABASE_URL environment variable is not set")
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


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
        # Get the signing key from JWKS endpoint
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "HS256"],
            audience="authenticated"
        )
    except jwt.PyJWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

    logger.debug(f"Authenticated user: {payload.get('sub')}")
    return payload  # Contains user_id (sub), email, role

