import logging
import uuid

import redis
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from src.pdf_backend.config.config import settings
from src.pdf_backend.schemas.job import (
    JobSubmitResponse,
    JobStatusResponse,
    JobStatus,
    Tier,
)
from src.pdf_backend.services.multi_threading.job_store import JobStore
from src.pdf_backend.services.validator import validate_pdf, ValidationError

logger = logging.getLogger(__name__)
router = APIRouter()

# Shared Redis client and job store
_redis = redis.from_url(settings.redis_url, decode_responses=False)
_job_store = JobStore(_redis)


@router.post("/process", response_model=JobSubmitResponse, status_code=202)
async def process_document(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    project_id: str = Form(...),
    document_name: str = Form(...),
    user_id: str = Form(...),
    tier: Tier = Form(...),
    webhook_url: str = Form(...),
):
    """
    Validate and enqueue a PDF for processing.
    Returns job_id immediately (202 Accepted); result is delivered via webhook + SSE.
    """
    
    logger.info("Received processing request for document_id=%s user_id=%s tier=%s", document_id, user_id, tier)
    
    # Reject if user already has an active job
    existing = _job_store.active_job_for_user(user_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"message": "You already have a job in progress.", "job_id": existing},
        )

    # Validate file against tier limits — raises ValidationError on failure
    try:
        file_bytes = await validate_pdf(file, tier)
    except ValidationError as exc:
        return JSONResponse(
            status_code=422,
            content={"status": JobStatus.not_supported, "message": exc.message},
        )

    job_id = str(uuid.uuid4())
    _job_store.create(
        job_id=job_id,
        document_id=document_id,
        user_id=user_id,
        tier=tier,
    )

    # Enqueue to the appropriate priority queue
    _enqueue(
        job_id=job_id,
        document_id=document_id,
        project_id=project_id,
        document_name=document_name,
        user_id=user_id,
        tier=tier,
        webhook_url=webhook_url,
        file_bytes=file_bytes,
    )

    logger.info("Enqueued job %s for user %s (tier=%s)", job_id, user_id, tier)
    return JobSubmitResponse(job_id=job_id, status=JobStatus.queued)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Return the current status of a job."""
    job = _job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def _enqueue(
    job_id: str,
    document_id: str,
    project_id: str,
    document_name: str,
    user_id: str,
    tier: Tier,
    webhook_url: str,
    file_bytes: bytes,
) -> None:
    """Push the job onto the correct RQ priority queue."""
    from rq import Queue
    from src.pdf_backend.tasks.process_pdf import run_process_pdf

    queue_name = "high" if tier == Tier.pro else "low"
    q = Queue(queue_name, connection=_redis)
    q.enqueue(
        run_process_pdf,
        kwargs={
            "job_id": job_id,
            "document_id": document_id,
            "project_id": project_id,
            "document_name": document_name,
            "user_id": user_id,
            "tier": tier,
            "webhook_url": webhook_url,
            "file_bytes": file_bytes,
        },
        job_id=job_id,
        retry=None,  # retry logic handled inside the task
    )
