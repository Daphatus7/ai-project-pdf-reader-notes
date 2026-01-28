"""
User management API schemas.

Request and response models for user endpoints including:
- User profiles
- User updates
"""

from pydantic import BaseModel

class UserProfile(BaseModel):
    """User profile model"""
    id: str
    display_name: str
    
