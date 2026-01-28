# @file        service_storage.py
# @description Unified storage service for Redis connections and checkpointer
# @author      [Peiyu Wang]
# @date        2026-01-19

import logging
import redis
from langgraph.checkpoint.redis import ShallowRedisSaver

from src.backend.services.service import Service
from src.backend.config.config import settings


class RedisStorage(Service):
    """
    Unified storage service managing Redis connections.

    Provides:
    - Shared Redis connection pool
    - LangGraph ShallowRedisSaver checkpointer (only keeps latest checkpoint per thread)
    - Future: Supabase vector store
    """

    def __init__(self):
        self._logger = logging.getLogger(__name__)
        self._redis_conn: redis.Redis | None = None
        self._checkpointer: ShallowRedisSaver | None = None

    def start(self):
        """Initialize Redis connection and checkpointer."""
        if self._redis_conn is not None:
            return  # Already initialized

        self._logger.info(f"Connecting to Redis: {settings.redis_url}")

        # Create shared Redis connection
        self._redis_conn = redis.Redis.from_url(
            settings.redis_url,
            decode_responses=False  # RedisSaver needs bytes
        )

        # Verify connection
        self._redis_conn.ping()
        self._logger.info("Redis connection established")

        # Use ShallowRedisSaver: only keeps the latest checkpoint per thread

        self._checkpointer = ShallowRedisSaver(
            redis_client=self._redis_conn,
            ttl= {
                "default": settings.redis_thread_ttl
            }
        )
        self._checkpointer.setup()
        self._logger.info("ShallowRedisSaver checkpointer initialized with TTL=10min")

    def get(self):
        """Get the storage service instance."""
        return self

    @property
    def redis(self) -> redis.Redis:
        """Get shared Redis connection."""
        if self._redis_conn is None:
            raise RuntimeError("StorageService not started. Call start() first.")
        return self._redis_conn

    @property
    def checkpointer(self) -> ShallowRedisSaver:
        """Get LangGraph checkpointer."""
        if self._checkpointer is None:
            raise RuntimeError("StorageService not started. Call start() first.")
        return self._checkpointer

    def shut_down(self):
        """Close Redis connection."""
        if self._redis_conn is not None:
            self._logger.info("Closing Redis connection")
            self._redis_conn.close()
            self._redis_conn = None
            self._checkpointer = None

    # ==================== Thread TTL Management ====================

            
    
    def _get_thread_keys(self, thread_id: str) -> list[bytes]:
        """
        Get all Redis keys associated with a thread.

        ShallowRedisSaver uses keys with pattern: checkpoint:{thread_id}*
        """
        pattern = f"checkpoint:{thread_id}*"
        keys = list(self._redis_conn.scan_iter(match=pattern))
        return keys

    def thread_exists_in_redis(self, thread_id: str) -> bool:
        """
        Check if a thread exists in Redis.

        Args:
            thread_id: Thread ID to check

        Returns:
            True if thread has data in Redis, False otherwise
        """
        if self._redis_conn is None:
            logging.error("Redis connection not initialized")   
            return False
        keys = self._get_thread_keys(thread_id)
        logging.info(f"Thread {thread_id} has {len(keys)} keys in Redis")
        
        return len(keys) > 0

    def refresh_thread_ttl(self, thread_id: str) -> bool:
        """
        Refresh TTL for all keys associated with a thread.

        Called at the start of each request to keep active threads alive.

        Args:
            thread_id: Thread ID to refresh

        Returns:
            True if TTL was refreshed, False if thread not found
        """
        if self._redis_conn is None:
            return False

        keys = self._get_thread_keys(thread_id)
        if not keys:
            logging.info(f"No keys found for thread {thread_id}, cannot refresh TTL")
            return False

        ttl_seconds = settings.redis_thread_ttl
        for key in keys:
            self._redis_conn.expire(key, ttl_seconds)

        self._logger.debug(f"Refreshed TTL for thread {thread_id}: {len(keys)} keys, TTL={ttl_seconds}s")
        return True

    def set_thread_ttl(self, thread_id: str) -> bool:
        """
        Set initial TTL for a newly created thread.

        Args:
            thread_id: Thread ID to set TTL for

        Returns:
            True if TTL was set, False if thread not found
        """
        return self.refresh_thread_ttl(thread_id)

    def delete_thread_from_redis(self, thread_id: str) -> int:
        """
        Delete all keys associated with a thread from Redis.

        Args:
            thread_id: Thread ID to delete

        Returns:
            Number of keys deleted
        """
        if self._redis_conn is None:
            return 0

        keys = self._get_thread_keys(thread_id)
        if not keys:
            return 0

        deleted = self._redis_conn.delete(*keys)
        self._logger.info(f"Deleted thread {thread_id} from Redis: {deleted} keys")
        return deleted
