from enum import Enum
from pydantic import BaseModel, HttpUrl


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"
    not_supported = "not_supported"


class Tier(str, Enum):
    free = "free"
    pro = "pro"


# ── Inbound ────────────────────────────────────────────────────────────────────

class JobSubmitRequest(BaseModel):
    """Fields submitted alongside the PDF file via multipart/form-data."""
    document_id: str
    project_id: str
    document_name: str
    user_id: str
    tier: Tier
    webhook_url: HttpUrl


# ── Outbound ───────────────────────────────────────────────────────────────────

class JobSubmitResponse(BaseModel):
    """Returned immediately (HTTP 202) after the job is queued."""
    job_id: str
    status: JobStatus = JobStatus.queued


class JobStatusResponse(BaseModel):
    """Returned by GET /jobs/{job_id}."""
    job_id: str
    document_id: str
    status: JobStatus
    tier: Tier
    progress_pct: int | None = None
    chunk_count: int = 0
    message: str = ""


# ── Webhook ────────────────────────────────────────────────────────────────────

class WebhookPayload(BaseModel):
    """POSTed to webhook_url when the job finishes (success or failure)."""
    job_id: str
    document_id: str
    status: JobStatus
    chunk_count: int = 0
    message: str = ""
