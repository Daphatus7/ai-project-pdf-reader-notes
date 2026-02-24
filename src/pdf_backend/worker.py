"""
RQ Worker entry point.

Listens to 'high' (pro) queue first, then 'low' (free).
Start with:
    rq worker high low --url $REDIS_URL
or via the Dockerfile CMD defined for the worker service.
"""
import logging

import redis
from rq import Worker, Queue

from src.pdf_backend.config.config import settings

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    conn = redis.from_url(settings.redis_url, decode_responses=False)

    # Worker consumes 'high' before 'low' — this is RQ's built-in priority mechanism
    queues = [Queue("high", connection=conn), Queue("low", connection=conn)]
    worker = Worker(queues, connection=conn)
    worker.work()
