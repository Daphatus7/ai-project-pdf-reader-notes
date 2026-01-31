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
    email: str
    password: str

class RegisterRequest(BaseModel):
    """Registration request model"""
    email: str = Field(..., pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    username: str
    password: str
    full_name: str | None = None

class RegisterResponse(BaseModel):
    """Registration response model"""
    id: str
    email: str
    username: str
    full_name: str | None = None
    status: str

class LoginResponse(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int | None = None

class CreateProfileRequest(BaseModel):
    """Update profile request model"""
    display_name: str | None = None
class CreateProfileResponse(BaseModel):
    """Create profile response model"""
    response: list[dict]

class UserResponse(BaseModel):
    """User response model"""
    id: str
    username: str
    email: str
    full_name: str | None = None

class AuthContext(BaseModel):
    tenant_id: str | None = None
    user_id: str
    role: str  # user/admin
    plan: str | None = None

class UserRequest(BaseModel):
    auth: AuthContext
    client_request_id: str | None = None
    thread_id: str
    query: str
