"""
API package.

Contains all API versions and shared dependencies.
Currently supports:
- v1: Version 1 of the API
"""
from src.backend.api.v1 import router as v1_router

__all__ = ['v1_router']
