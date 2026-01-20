# @file        service_storage.py
# @description Unified storage service for Redis connections and checkpointer
# @author      [Peiyu Wang]
# @date        2026-01-19

import logging
import redis
from langgraph.checkpoint.redis import RedisSaver

from src.backend.services.service import Service
from src.backend.config.config import settings


class StorageService(Service):
    """
    Unified storage service managing Redis connections.

    Provides:
    - Shared Redis connection pool
    - LangGraph RedisSaver checkpointer
    - Future: Supabase vector store
    """

    def __init__(self):
        self._logger = logging.getLogger(__name__)
        self._redis_conn: redis.Redis | None = None
        self._checkpointer: RedisSaver | None = None

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

        # Create checkpointer with shared connection
        self._checkpointer = RedisSaver(redis_client=self._redis_conn)
        self._checkpointer.setup()  # Create Redis indexes
        self._logger.info("RedisSaver checkpointer initialized")

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
    def checkpointer(self) -> RedisSaver:
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
