"""
Authentication API schemas.

Request and response models for authentication endpoints including:
- User login
- User registration
- Token management
"""

from pydantic import BaseModel, Field




class LoginRequest(BaseModel):
    """Login request model"""
    username: str
    password: str

class RegisterRequest(BaseModel):
    """Registration request model"""
    email: str = Field(..., pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    username: str
    password: str
    full_name: str | None = None


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int | None = None


class UserResponse(BaseModel):
    """User response model"""
    id: str
    username: str
    email: str
    full_name: str | None = None

class UserRequest(BaseModel):
    """
        Contextual information about the request and user.
    """
    user_id: str # authenticated user ID
    access_token: str # e.g., JWT token
    tenant_id: str # e.g., tenant server id
    role: str # e.g., 'user', 'admin'
    plan: str | None = None # e.g., 'free', 'pro', 'enterprise'
