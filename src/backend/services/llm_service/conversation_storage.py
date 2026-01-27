# @file        conversation_storage.py
# @description Dual-database conversation storage manager (Redis + Supabase)
# @date        2026-01-27

import logging
from typing import TYPE_CHECKING

from langchain_core.messages import HumanMessage, AIMessage

if TYPE_CHECKING:
    from src.backend.services.storage.supabase_storage import SupabaseStorage
    from src.backend.services.storage.redis_storage import RedisStorage

logger = logging.getLogger(__name__)


class ConversationStorage:
    """
    Manages conversation storage across Redis (short-term) and Supabase (long-term).

    Responsibilities:
    - Refresh Redis TTL on request start
    - Cold start: load from Supabase when Redis thread is empty
    - Dual-write: persist messages to Supabase after each conversation turn
    """

    def __init__(
        self,
        supabase_storage: "SupabaseStorage | None" = None,
        redis_storage: "RedisStorage | None" = None
    ):
        self._database = supabase_storage
        self._storage_service = redis_storage

    def refresh_ttl(self, thread_id: str) -> bool:
        """
        Refresh Redis TTL at request start.

        Returns:
            True if TTL was refreshed, False otherwise
        """
        if not self._storage_service:
            return False
        return self._storage_service.refresh_thread_ttl(thread_id)

    def thread_in_redis(self, thread_id: str) -> bool:
        """Check if thread exists in Redis."""
        if not self._storage_service:
            return False
        return self._storage_service.thread_exists_in_redis(thread_id)

    async def thread_in_supabase(self, thread_id: str) -> bool:
        """Check if thread exists in Supabase."""
        if not self._database:
            return False
        return await self._database.thread_exists(thread_id)

    async def cold_start_load(self, thread_id: str) -> list[dict] | None:
        """
        Load messages from Supabase if thread not in Redis.

        Called at request start to restore conversation history.

        Returns:
            List of message dicts, or None if no cold start needed
        """        
        
        logger.info("Starting cold start load")
        if not self._storage_service or not self._database:
            logger.info("No storage/database configured, skipping cold start")
            return None

        # Already in Redis, no cold start needed
        if self.thread_in_redis(thread_id):
            logger.debug(f"Thread {thread_id} exists in Redis, skipping cold start")
            return None

        # Not in Supabase either, it's a new thread
        if not await self.thread_in_supabase(thread_id):
            logger.debug(f"Thread {thread_id} is new, no history to load")
            return None

        # Cold start: load from Supabase
        messages = await self._database.load_recent_messages(thread_id)
        logger.info(f"Cold start: loaded {len(messages)} messages for thread {thread_id}")
        return messages

    async def persist(
        self,
        user_id: str,
        thread_id: str,
        human_content: str,
        ai_content: str,
        input_tokens: int = 0,
        output_tokens: int = 0
    ) -> None:
        """
        Persist human and AI messages to Supabase.

        Called after each conversation turn completes.

        Args:
            user_id: User's unique identifier
            thread_id: Conversation thread ID
            human_content: User's message text
            ai_content: AI's response text
            input_tokens: Token count for user message
            output_tokens: Token count for AI response
        """
        if not self._database:
            logger.warning("No database configured, skipping persistence")
            return

        try:
            # Save user message
            await self._database.save_message(
                user_id=user_id,
                thread_id=thread_id,
                role='user',
                content={'text': human_content},
                token_count=input_tokens
            )

            # Save AI message
            await self._database.save_message(
                user_id=user_id,
                thread_id=thread_id,
                role='assistant',
                content={'text': ai_content},
                token_count=output_tokens
            )

            logger.info(f"Persisted messages to Supabase: thread={thread_id}")

        except Exception as e:
            logger.error(f"Failed to persist to Supabase: {e}")
