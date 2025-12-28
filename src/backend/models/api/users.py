"""
User management API schemas.

Request and response models for user endpoints including:
- User profiles
- User updates
"""

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    """User profile model"""
    id: str
    username: str
    email: str
    full_name: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class UpdateUserRequest(BaseModel):
    """Update user request model"""
    full_name: str | None = None
    email: str | None = Field(None, pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
