import asyncio
import logging

logger = logging.getLogger(__name__)


class SseManager:
    """
    In-memory registry mapping job_id → asyncio.Queue.
    Each connected SSE client has one queue; events pushed here
    are streamed to the browser in real time.
    """

    def __init__(self):
        # job_id → Queue of serialised event strings
        self._connections: dict[str, asyncio.Queue] = {}

    def connect(self, job_id: str) -> asyncio.Queue:
        """Register a new SSE listener for job_id and return its queue."""
        q: asyncio.Queue = asyncio.Queue()
        self._connections[job_id] = q
        logger.info("SSE client connected for job %s", job_id)
        return q

    def disconnect(self, job_id: str) -> None:
        """Remove the listener after the client disconnects."""
        self._connections.pop(job_id, None)
        logger.info("SSE client disconnected for job %s", job_id)

    def push(self, job_id: str, data: str) -> None:
        """
        Push an event string to the waiting SSE client.
        No-op if the client is offline (webhook arrives before or after connection).
        """
        q = self._connections.get(job_id)
        if q:
            q.put_nowait(data)
        else:
            logger.debug("No SSE client for job %s — event dropped", job_id)


# Singleton shared across the main backend process
sse_manager = SseManager()
