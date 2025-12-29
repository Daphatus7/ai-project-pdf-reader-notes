"""
Models represent the data structures and business entities manipulated by the backend.

Structure:
- schemas/: API Request/Response models (Pydantic schemas for API endpoints)
- domain/: Database models and domain entities (ORM models, business logic models)
- *_models/: Feature-specific model collections

模型：模型代表后端操作的数据结构和业务实体。无论是处理用户、产品还是交易，将模型放在指定的文件夹中都有助于提高清晰度并简化数据库交互。
"""


from models.chat_models import *
from models.context_models import *
from models.note_models import *
from models.output_models import *
from models.user_models import *

__all__ = [
    # Chat models
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse"
]
