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

class ChatInput(BaseModel):
    message: str
    thread_id: str | None = None
    client_request_id: str | None = None

class AuthContext(BaseModel):
    tenant_id: str | None = None
    user_id: str
    role: str  # user/admin
    plan: str | None = None

class UserRequest(BaseModel):
    auth: AuthContext
    thread_id: str
    message: str
    client_request_id: str | None = None
