import logging
import os
import tempfile

import redis

from src.pdf_backend.config.config import settings
from src.pdf_backend.schemas.job import JobStatus
from src.pdf_backend.services.multi_threading.cpu_scheduler import CpuScheduler
from src.pdf_backend.services.multi_threading.job_store import JobStore
from src.pdf_backend.services.rag_service import RagService
from src.pdf_backend.services.webhook import send_webhook

logger = logging.getLogger(__name__)

_rag_service = RagService()
_rag_service.start()


def run_process_pdf(
    job_id: str,
    document_id: str,
    project_id: str,
    document_name: str,
    user_id: str,
    tier: str,
    webhook_url: str,
    file_bytes: bytes,
) -> None:
    """
    RQ task: full RAG pipeline for a single PDF.
    Runs inside a worker process — no async, plain blocking code.
    """
    # Fresh connection per forked job — avoids sharing sockets across fork boundary.
    r = redis.from_url(settings.redis_url, decode_responses=False)
    store     = JobStore(r)
    scheduler = CpuScheduler(r)

    # Block until global core quota (across all workers) is available.
    allocated_cores = scheduler.acquire(tier)
    store.update(job_id, status=JobStatus.processing, progress_pct=0)

    suffix = ".pdf"
    tmp_path: str | None = None

    try:
        # Write bytes to a temp file (RagService expects a file path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        success, chunk_count, message = _rag_service.process_sync(
            document_id=document_id,
            project_id=project_id,
            document_name=document_name,
            file_path=tmp_path,
            cores=allocated_cores,
            on_progress=lambda pct: store.update(job_id, progress_pct=pct),
        )

        final_status = JobStatus.done if success else JobStatus.failed
        store.update(
            job_id,
            status=final_status,
            chunk_count=chunk_count,
            message=message,
            progress_pct=100 if success else None,
        )

        send_webhook(
            webhook_url=webhook_url,
            job_id=job_id,
            document_id=document_id,
            status=final_status,
            chunk_count=chunk_count,
            message=message,
        )

    except Exception as exc:
        logger.exception("Unexpected error in job %s: %s", job_id, exc)
        store.update(job_id, status=JobStatus.failed, message=str(exc))
        send_webhook(
            webhook_url=webhook_url,
            job_id=job_id,
            document_id=document_id,
            status=JobStatus.failed,
            message=str(exc),
        )

    finally:
        scheduler.release(allocated_cores)
        store.delete_user_lock(user_id)
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
