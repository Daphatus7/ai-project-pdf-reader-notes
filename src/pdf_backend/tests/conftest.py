"""
Shared pytest fixtures for pdf_backend tests.

Provides:
- Real PDF bytes/paths from test_doc1.pdf and test_doc2.pdf
- In-memory fakeredis (reset per test)
- JobStore backed by fakeredis
- CpuScheduler patched to 12 cores (local MacBook spec)
"""
from pathlib import Path
from unittest.mock import patch

import fakeredis
import pytest

from src.pdf_backend.services.cpu_scheduler import CpuScheduler
from src.pdf_backend.services.job_store import JobStore

TESTS_DIR = Path(__file__).parent
PDF1 = TESTS_DIR / "test_doc1.pdf"
PDF2 = TESTS_DIR / "test_doc2.pdf"

# ── 12-core MacBook override (production config uses total_cores=30) ──────────
_WORKER_CFG_12 = {"total_cores": 12, "dynamic_scale": True}
_TIER_CFGS = {
    "free": {"cpu_cores": 1, "max_pages": 50, "max_file_size_mb": 20},
    "pro":  {"cpu_cores": 4, "max_pages": 500, "max_file_size_mb": 100},
}


# ── PDF file fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def test_doc1_bytes() -> bytes:
    """Raw bytes of test_doc1.pdf (332 KB)."""
    return PDF1.read_bytes()


@pytest.fixture(scope="session")
def test_doc2_bytes() -> bytes:
    """Raw bytes of test_doc2.pdf (1.2 MB)."""
    return PDF2.read_bytes()


@pytest.fixture(scope="session")
def test_doc1_path() -> Path:
    return PDF1


@pytest.fixture(scope="session")
def test_doc2_path() -> Path:
    return PDF2


# ── Redis / storage fixtures ──────────────────────────────────────────────────

@pytest.fixture
def fake_redis():
    """In-memory FakeRedis, flushed after each test."""
    r = fakeredis.FakeRedis(decode_responses=False)
    yield r
    r.flushall()


@pytest.fixture
def job_store(fake_redis):
    return JobStore(fake_redis)


# ── CPU Scheduler fixture (12-core) ───────────────────────────────────────────

@pytest.fixture
def scheduler_12():
    """
    CpuScheduler with total_cores=12 (MacBook M-series).
    Patches get_worker_config and get_tier_config to bypass lru_cache
    and avoid reading server_configuration.json.
    """
    with patch(
        "src.pdf_backend.services.cpu_scheduler.get_worker_config",
        return_value=_WORKER_CFG_12,
    ), patch(
        "src.pdf_backend.services.cpu_scheduler.get_tier_config",
        side_effect=lambda t: _TIER_CFGS[t],
    ):
        yield CpuScheduler()
