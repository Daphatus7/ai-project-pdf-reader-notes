"""
Authentication API endpoints.

Provides endpoints for:
- User login
- User registration
- Token refresh
- Password reset
"""
import logging

from fastapi import APIRouter, HTTPException, Depends
from supabase_auth import AuthResponse

from src.backend.api.deps import get_database_service, get_user
from src.backend.schemas import (
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    UserResponse,
)
from src.backend.schemas.auth import CreateProfileRequest, CreateProfileResponse, RegisterResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/auth', tags=['authentication'])


@router.post('/login', response_model=AuthResponse)
async def login(request: LoginRequest,
                database_service=Depends(get_database_service)
                ):
    """
        User login endpoint.
    """
    try:
        #use the database service to authenticate user
        resp=await database_service.login(
            email=request.email,
            password=request.password
        )
        logger.info(f"User logged in: {request}")
        return resp #TODO !!危险操作，，返回的内容太多了 记得删了 , dangerous operation, the returned content is too much, remember to delete it
    except Exception as e:
        logger.error(f"Error in login endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
        


@router.post('/register', response_model=RegisterResponse)
async def register(request: RegisterRequest,
                   database_service=Depends(get_database_service)
                   ):
    """
    Register a new user account.

    Args:
        request: Registration details

    Returns:
        Created user information

    Raises:
        HTTPException: If registration fails
        :param request: 
        :param database_service: 
    """
    try:
        register_resp = await database_service.register(request)
        logger.info(f"User registered: {request.email}")

        user = register_resp.user
        user_metadata = user.user_metadata or {}

        return RegisterResponse(
            id=user.id,
            email=user.email,
            username=user_metadata.get('username', request.username),
            full_name=user_metadata.get('full_name', request.full_name),
            status="pending_verification" if not user.email_confirmed_at else "active"
        )
    except Exception as e:
        logger.error(f"Error in register endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Registration failed")


@router.post('/refresh', response_model=LoginResponse)
async def refresh_token(token: str):
    """
    Refresh access token using refresh token.

    Args:
        token: Valid refresh token

    Returns:
        New access token

    Raises:
        HTTPException: If refresh token is invalid
    """
    try:
        # TODO: Implement token refresh logic
        # 1. Validate refresh token
        # 2. Generate new access token
        # 3. Return token response

        raise HTTPException(
            status_code=501,
            detail="Token refresh not yet implemented"
        )

    except Exception as e:
        logger.error(f"Error in refresh_token endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post('/logout')
async def logout():
    """
    Logout user (invalidate token).

    Returns:
        Success message
    """
    try:
        # TODO: Implement logout logic
        # 1. Invalidate token (add to blacklist or remove from whitelist)
        # 2. Clear any session data

        return {"message": "Logged out successfully"}

    except Exception as e:
        logger.error(f"Error in logout endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Logout failed")


@router.post('/create-profile', response_model=CreateProfileResponse)
async def create_profile(
    request: CreateProfileRequest,
    user=Depends(get_user),
    database_service=Depends(get_database_service)
):
    """
    Create user profile information.

    Returns:
        Created user profile information
    """
    try:
        resp = await database_service.create_user_profile(
            user['sub'],
            display_name=request.display_name,
        )
        logger.info(f"User profile created: {user['sub']}")
        return CreateProfileResponse(response=resp.data)
    except Exception as e:
        logger.error(f"Error in create_profile endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Create profile failed")
        