import json
import logging
from typing import Optional

import redis

from src.pdf_backend.schemas.job import JobStatus, JobStatusResponse, Tier

logger = logging.getLogger(__name__)

# Job state TTL: 24 hours
_JOB_TTL = 86400

# Key patterns
_KEY_JOB = "pdf:job:{job_id}"
_KEY_USER_JOB = "pdf:user_job:{user_id}"


class JobStore:
    """
    Redis-backed store for job state.
    Tracks job status and enforces one-active-job-per-user policy.
    """

    def __init__(self, redis_client: redis.Redis):
        self._r = redis_client

    # ── Write ──────────────────────────────────────────────────────────────────

    def create(
        self,
        job_id: str,
        document_id: str,
        user_id: str,
        tier: Tier,
    ) -> None:
        """Persist a new job in queued state and bind it to the user."""
        data = {
            "job_id": job_id,
            "document_id": document_id,
            "user_id": user_id,
            "tier": tier,
            "status": JobStatus.queued,
            "progress_pct": None,
            "chunk_count": 0,
            "message": "",
        }
        pipe = self._r.pipeline()
        pipe.setex(_KEY_JOB.format(job_id=job_id), _JOB_TTL, json.dumps(data))
        # Map user → job_id so we can enforce one-job-per-user
        pipe.setex(_KEY_USER_JOB.format(user_id=user_id), _JOB_TTL, job_id)
        pipe.execute()

    def update(self, job_id: str, **fields) -> None:
        """Patch one or more fields on an existing job."""
        key = _KEY_JOB.format(job_id=job_id)
        raw: bytes | None = self._r.get(key)  # type: ignore[assignment]
        if not raw:
            logger.warning("update called on unknown job %s", job_id)
            return
        data = json.loads(raw)
        data.update(fields)
        self._r.setex(key, _JOB_TTL, json.dumps(data))

    def delete_user_lock(self, user_id: str) -> None:
        """Release the one-job-per-user lock when a job finishes."""
        self._r.delete(_KEY_USER_JOB.format(user_id=user_id))

    # ── Read ───────────────────────────────────────────────────────────────────

    def get(self, job_id: str) -> Optional[JobStatusResponse]:
        """Return current job state, or None if not found."""
        raw: bytes | None = self._r.get(_KEY_JOB.format(job_id=job_id))  # type: ignore[assignment]
        if not raw:
            return None
        data = json.loads(raw)
        return JobStatusResponse(**data)

    def active_job_for_user(self, user_id: str) -> Optional[str]:
        """Return the active job_id for a user, or None."""
        val: bytes | None = self._r.get(_KEY_USER_JOB.format(user_id=user_id))  # type: ignore[assignment]
        return val.decode() if val else None
