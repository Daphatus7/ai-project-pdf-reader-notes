# @file        conversation_storage.py
# @description Dual-database conversation storage manager (Redis + Supabase)
# @date        2026-01-27

import logging
from typing import TYPE_CHECKING, Any, Coroutine

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
        self._supabase_storage = supabase_storage
        self._redis_storage = redis_storage

    def refresh_ttl(self, thread_id: str) -> bool:
        """
        Refresh Redis TTL at request start.

        Returns:
            True if TTL was refreshed, False otherwise
        """
        if not self._redis_storage:
            return False
        return self._redis_storage.refresh_thread_ttl(thread_id)

    def thread_in_redis(self, thread_id: str) -> bool:
        """Check if thread exists in Redis."""
        if not self._redis_storage:
            logger.error("|----- No storage service configured, cannot check Redis")
            return False
        return self._redis_storage.thread_exists_in_redis(thread_id)

    async def thread_in_supabase(self, thread_id: str) -> bool:
        """Check if thread exists in Supabase."""
        if not self._supabase_storage:
            return False
        return await self._supabase_storage.thread_exists(thread_id)

    async def cold_start_load(self, thread_id: str) -> list[dict] | None:
        """
        Load messages from Supabase if thread not in Redis.

        Called at request start to restore conversation history.

        Returns:
            List of message dicts, or None if no cold start needed
        """        
        
        logger.info("Starting cold start load")
        if not self._redis_storage or not self._supabase_storage:
            logger.info("No storage/database configured, skipping cold start")
            return None

        # Already in Redis, no cold start needed
        if self.thread_in_redis(thread_id):
            logger.debug(f"Thread {thread_id} exists in Redis, skipping cold start")
            #get the actual messages from redis   
            return None

        # Not in Supabase either, it's a new thread
        if not await self.thread_in_supabase(thread_id):
            logger.debug(f"Thread {thread_id} is new, no history to load")
            return None

        # Cold start: load from Supabase
        messages = await self._supabase_storage.load_recent_messages(thread_id)
        logger.info(f"Cold start: loaded {len(messages)} messages for thread {thread_id}")
        return messages

    async def persist(
        self,
        user_id: str,
        thread_id: str,
        role: str,
        content: str,
        token_count: int = 0
    ) -> dict | None:
        """
        Persist human and AI messages to Supabase.

        Called after each conversation turn completes.

        Args:
            user_id: User's unique identifier
            thread_id: Conversation thread ID
            content: content
            token_count: Token count for message
        """
        if not self._supabase_storage:
            logger.warning("No database configured, skipping persistence")
            return None

        try:
            # Save Content
            resp = await self._supabase_storage.save_message(
                user_id=user_id,
                thread_id=thread_id,
                role=role,
                content=content,
                token_count=token_count
            )
            
            logger.info(f"Persisted messages to Supabase: thread={thread_id}")
            return resp
        except Exception as e:
            logger.error(f"Failed to persist to Supabase: {e}")
