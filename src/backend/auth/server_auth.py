# @file        auth.py
# @description
# @author      [Peiyu Wang]
# @date        29/12/2025
# @license     © 2025 . All rights reserved.
import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.backend.api.deps import get_jwks_client
from src.backend.schemas.auth import AuthContext
import jwt

logger = logging.getLogger(__name__)
security = HTTPBearer()


async def verify_user_is_allowed(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthContext:
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
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get tenant info from app_metadata
    app_metadata = payload.get("app_metadata", {})

    return AuthContext(
        user_id=user_id,
        tenant_id=app_metadata.get("tenant_id"),
        role=app_metadata.get("role", "user"),
        plan=app_metadata.get("plan")
    )