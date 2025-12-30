# @file        auth.py
# @description 
# @author      [Peiyu Wang]
# @date        29/12/2025
# @license     © 2025 . All rights reserved.
import jwt
from fastapi import Depends, security, HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.backend.config.config import settings
from src.backend.schemas.auth import UserRequest


async def verify_user_is_allowed(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserRequest:
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 从 app_metadata 获取租户信息
    app_metadata = payload.get("app_metadata", {})

    return UserRequest(
        user_id=user_id,
        access_token=token,
        tenant_id=app_metadata.get("tenant_id", "default"),
        role=app_metadata.get("role", "user"),
        plan=app_metadata.get("plan")
    )