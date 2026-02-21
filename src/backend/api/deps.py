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
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.backend.servers import services
from src.backend.schemas import ChatRequest
from src.backend.schemas.error import service_unavailable, auth_required

logger = logging.getLogger(__name__)

# Initialize JWKS client for Supabase token verification
_jwks_client: Optional[PyJWKClient] = None

# Security scheme for Swagger UI
security = HTTPBearer()


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
        return services.get_service('llm_service')
    except ValueError as e:
        logger.error(f'Failed to get LLM service: {e}')
        service_unavailable("LLM service")

def get_database_service():
    """

    :return:
    """
    try:
        return services.get_service('database_service')
    except ValueError as e:
        logger.error(f'Failed to get database service: {e}')
        service_unavailable("Database service")

def get_stripe_service():
    try:
        return services.get_service('stripe_service')
    except ValueError as e:
        logger.error(f'Failed to get stripe service: {e}')
        service_unavailable("Stripe service")


# Authentication Dependency
async def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

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
        auth_required("Invalid token")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        auth_required("Authentication failed")

    logger.debug(f"Authenticated user: {payload.get('sub')}")
    return payload  # Contains user_id (sub), email, role


# Composite dependency: inject user_id into ChatRequest
async def get_chat_request(
    payload: ChatRequest,
    user: dict = Depends(get_user)
) -> ChatRequest:
    """
    Composite dependency that injects authenticated user_id into ChatRequest.
    This ensures user_id comes from the auth token, not from client input.
    """
    payload.user_id = user["sub"]
    return payload