"""
Pytest configuration for backend tests.

Install test deps:
    pip install pytest pytest-asyncio httpx
"""
import os

# Must be set before any backend module is imported, because config.py
# instantiates Settings() at module level and cors_origins has no default.
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

import pytest


# Allow @pytest.mark.asyncio on all async tests without repeating the decorator
def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as async")
