"""
User management API endpoints.

Provides endpoints for:
- Get current user profile
- Update user profile
- Delete user account
- List users (admin only)
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from src.backend.schemas import (
    UserProfile,
    UpdateUserRequest,
)
from src.backend.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/users', tags=['users'])


@router.get('/me', response_model=UserProfile)
async def get_current_user_profile(current_user=Depends(get_current_user)):
    """
    Get current authenticated user's profile.

    Args:
        current_user: Current authenticated user from dependency

    Returns:
        User profile information

    Raises:
        HTTPException: If user not found
    """
    try:
        # TODO: Implement get current user logic
        # 1. Fetch user details from database
        # 2. Return user profile

        logger.info(f"Fetching profile for current user")

        raise HTTPException(
            status_code=501,
            detail="Get user profile not yet implemented"
        )

    except Exception as e:
        logger.error(f"Error in get_current_user_profile endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="User not found")


@router.put('/me', response_model=UserProfile)
async def update_current_user_profile(
    request: UpdateUserRequest,
    current_user=Depends(get_current_user)
):
    """
    Update current authenticated user's profile.

    Args:
        request: Update user request with new values
        current_user: Current authenticated user from dependency

    Returns:
        Updated user profile

    Raises:
        HTTPException: If update fails
    """
    try:
        # TODO: Implement update user logic
        # 1. Validate new email is unique (if changed)
        # 2. Update user in database
        # 3. Return updated user profile

        logger.info(f"Updating profile for current user")

        raise HTTPException(
            status_code=501,
            detail="Update user profile not yet implemented"
        )

    except Exception as e:
        logger.error(f"Error in update_current_user_profile endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Update failed")



@router.get('/{user_id}', response_model=UserProfile)
async def get_user_by_id(user_id: str, current_user=Depends(get_current_user)):
    """
    Get user profile by ID.

    Args:
        user_id: User ID to fetch
        current_user: Current authenticated user from dependency

    Returns:
        User profile information

    Raises:
        HTTPException: If user not found or unauthorized
    """
    try:
        # TODO: Implement get user by ID logic
        # 1. Check if current user has permission to view this user
        # 2. Fetch user from database
        # 3. Return user profile

        logger.info(f"Fetching user profile for user_id: {user_id}")

        raise HTTPException(
            status_code=501,
            detail="Get user by ID not yet implemented"
        )

    except Exception as e:
        logger.error(f"Error in get_user_by_id endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="User not found")


@router.get('/', response_model=List[UserProfile])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user)
):
    """
    List all users (admin only).

    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        current_user: Current authenticated user from dependency

    Returns:
        List of user profiles

    Raises:
        HTTPException: If not authorized or fetch fails
    """
    try:
        # TODO: Implement list users logic
        # 1. Check if current user is admin
        # 2. Fetch users from database with pagination
        # 3. Return list of user profiles

        logger.info(f"Listing users with skip={skip}, limit={limit}")

        raise HTTPException(
            status_code=501,
            detail="List users not yet implemented"
        )

    except Exception as e:
        logger.error(f"Error in list_users endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=403, detail="Not authorized")
