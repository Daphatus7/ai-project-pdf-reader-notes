"""
RQ Worker entry point — multi-process edition.

Spawns WORKER_COUNT worker processes (default 8 on Railway 32-core).
Each process consumes 'high' (pro) then 'low' (free) queues independently.
The global CPU quota is enforced across all processes via Redis (CpuScheduler).

Railway deployment:
  Set WORKER_COUNT env var to tune concurrency.
  With 32 cores, free_cores=2 and pro_cores=8:
    - max concurrent free jobs: 16
    - max concurrent pro jobs:   4
    - WORKER_COUNT=16 saturates the pool under all-free load
"""
import logging
import multiprocessing
import os
import signal
import sys

import redis
from rq import Worker, Queue

from src.pdf_backend.config.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _run_single_worker() -> None:
    """Entry point for each worker subprocess."""
    # Each subprocess creates its own Redis connection.
    conn = redis.from_url(settings.redis_url, decode_responses=False)
    queues = [Queue("high", connection=conn), Queue("low", connection=conn)]
    worker = Worker(queues, connection=conn)
    worker.work()


if __name__ == "__main__":
    worker_count = int(os.getenv("WORKER_COUNT", "8"))
    logger.info("Starting %d RQ worker processes", worker_count)

    # daemon=False so that worker processes can spawn their own subprocesses
    # (e.g. ProcessPoolExecutor for parallel PDF extraction).
    # SIGTERM handler below ensures all children are still terminated on shutdown.
    processes: list[multiprocessing.Process] = [
        multiprocessing.Process(target=_run_single_worker, daemon=False)
        for _ in range(worker_count)
    ]

    for p in processes:
        p.start()

    # Forward SIGTERM to all children so Railway can shut down cleanly.
    def _shutdown(signum, frame):
        logger.info("Received signal %d, terminating workers...", signum)
        for p in processes:
            p.terminate()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    for p in processes:
        p.join()
