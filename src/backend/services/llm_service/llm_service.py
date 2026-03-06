import dotenv
import logging
from typing import TypeVar, AsyncGenerator, Any, TYPE_CHECKING
from pydantic import BaseModel
# from langgraph.checkpoint.base import BaseCheckpointSaver
from src.backend.schemas import ChatRequest
from src.backend.services.llm_service.grok.grok import LlmGrok
from src.backend.services.llm_service.llm_instance import LangchainChat
from src.backend.services.storage.redis_storage import RedisStorage

if TYPE_CHECKING:
    from src.backend.services.storage.supabase_storage import SupabaseStorage
    from src.backend.services.storage.lang_redis_storage import LangRedisStorage

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class LlmService:
    """
    Provide a unified interface for providing LLM services.

    Supports both regular chat and structured output modes.
    Structured output ensures the LLM returns responses conforming to a specified Pydantic schema.
    """

    def shut_down(self):
        pass

    def restart(self):
        pass

    def __init__(
        self,
        redis_storage: RedisStorage,
        database: SupabaseStorage,
    ):
        super().__init__()
        dotenv.load_dotenv()
        self.model=LlmGrok()

    def get_usage(self):
        ... #todo 
            
    async def chat(self, request: ChatRequest) -> Any:
        return await self.model.chat(request=request)