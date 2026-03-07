import logging
from typing import Any

from src.backend.schemas import ChatRequest
from src.backend.services.llm_service.grok.grok import LlmGrok
from src.backend.services.storage.supabase_storage import SupabaseStorage

logger = logging.getLogger(__name__)


class LlmService:
    """Unified interface for LLM chat, backed by LlmGrok."""

    def __init__(self, database: SupabaseStorage):
        self.model = LlmGrok(supabase_storage=database)

    async def chat(self, request: ChatRequest) -> Any:
        return await self.model.chat(request=request)