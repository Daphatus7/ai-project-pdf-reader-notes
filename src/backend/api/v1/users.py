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

from src.backend.api.deps import get_user
from src.backend.schemas import (
    UserProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/users', tags=['users'])

# Profile
@router.get('/get_user_profile', response_model=UserProfile)
async def get_user_profile(
        user=Depends(get_user)):
    return get_user_profile(user)