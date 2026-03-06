# @file        __init__.py
# @description Storage service module
# @author      [Peiyu Wang]
# @date        2026-01-19

from src.backend.services.storage.lang_redis_storage import LangRedisStorage

__all__ = ["LangRedisStorage"]
