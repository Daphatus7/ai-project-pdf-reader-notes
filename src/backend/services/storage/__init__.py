# @file        __init__.py
# @description Storage service module
# @author      [Peiyu Wang]
# @date        2026-01-19

from src.backend.services.storage.redis_storage import RedisStorage

__all__ = ["RedisStorage"]
