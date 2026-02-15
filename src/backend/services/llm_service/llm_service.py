import dotenv
import logging
from typing import TypeVar, AsyncGenerator, Any, TYPE_CHECKING
from pydantic import BaseModel
from langgraph.checkpoint.base import BaseCheckpointSaver
from src.backend.schemas import ChatRequest
from src.backend.services.llm_service.llm_instance import LlmAgent

if TYPE_CHECKING:
    from src.backend.services.storage.supabase_storage import SupabaseStorage
    from src.backend.services.storage.redis_storage import RedisStorage

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
        checkpointer: BaseCheckpointSaver,
        database: "SupabaseStorage | None" = None,
        storage_service: "RedisStorage | None" = None
    ):
        super().__init__()
        dotenv.load_dotenv()
        self.model = LlmAgent(
            checkpointer=checkpointer,
            supabase_storage=database,
            redis_storage=storage_service
        )

    def get_usage(self):
        ... #todo 
            
    async def chat(self, request: ChatRequest) -> Any:
        return await self.model.chat(request=request)