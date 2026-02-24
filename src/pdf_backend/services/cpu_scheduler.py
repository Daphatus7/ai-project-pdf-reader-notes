import threading
import logging

from src.pdf_backend.services.server_config import get_worker_config, get_tier_config

logger = logging.getLogger(__name__)


class CpuScheduler:
    """
    Token-bucket CPU scheduler.
    Each job acquires N core tokens before processing and releases them on completion.
    Supports dynamic scale: if no other jobs are competing, any tier gets max cores.
    """

    def __init__(self):
        cfg = get_worker_config()
        self._total: int = cfg["total_cores"]
        self._dynamic: bool = cfg["dynamic_scale"]
        self._available: int = self._total
        self._lock = threading.Lock()
        self._condition = threading.Condition(self._lock)
        # Track active jobs count to support dynamic scaling
        self._active_jobs: int = 0

    def acquire(self, tier: str) -> int:
        """
        Block until enough cores are available, then reserve them.
        Returns the number of cores actually allocated.
        """
        requested = get_tier_config(tier)["cpu_cores"]

        with self._condition:
            while True:
                alloc = self._resolve_allocation(tier, requested)
                if self._available >= alloc:
                    self._available -= alloc
                    self._active_jobs += 1
                    logger.info(
                        "Allocated %d cores for %s tier (remaining=%d)",
                        alloc, tier, self._available,
                    )
                    return alloc
                self._condition.wait()

    def release(self, cores: int) -> None:
        """Return cores to the pool and wake waiting workers."""
        with self._condition:
            self._available += cores
            self._active_jobs = max(0, self._active_jobs - 1)
            logger.info("Released %d cores (available=%d)", cores, self._available)
            self._condition.notify_all()

    def _resolve_allocation(self, tier: str, requested: int) -> int:
        """
        Dynamic scale: if this is the only job, give it as many cores as possible
        up to what the pool has, regardless of tier limit.
        """
        if self._dynamic and self._active_jobs == 0:
            return min(self._total, self._available)
        return requested


# Singleton shared across the worker process
cpu_scheduler = CpuScheduler()
