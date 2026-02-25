import logging
import time

import httpx

from src.pdf_backend.schemas.job import JobStatus, WebhookPayload

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_BACKOFF_SECONDS = [1, 3, 9]  # exponential backoff


def send_webhook(
    webhook_url: str,
    job_id: str,
    document_id: str,
    status: JobStatus,
    chunk_count: int = 0,
    message: str = "",
) -> None:
    """
    POST job result to the caller's webhook URL.
    Retries up to 3 times with exponential backoff on failure.
    Runs synchronously — called from within the RQ worker process.
    """
    payload = WebhookPayload(
        job_id=job_id,
        document_id=document_id,
        status=status,
        chunk_count=chunk_count,
        message=message,
    ).model_dump()

    for attempt, wait in enumerate(_BACKOFF_SECONDS, start=1):
        try:
            resp = httpx.post(webhook_url, json=payload, timeout=10)
            resp.raise_for_status()
            logger.info("Webhook delivered for job %s (attempt %d)", job_id, attempt)
            return
        except Exception as exc:
            logger.warning(
                "Webhook attempt %d/%d failed for job %s: %s",
                attempt, _MAX_RETRIES, job_id, exc,
            )
            if attempt < _MAX_RETRIES:
                time.sleep(wait)

    logger.error("Webhook permanently failed for job %s after %d attempts", job_id, _MAX_RETRIES)
