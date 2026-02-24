"""
Integration tests for JobStore (Redis-backed job state).

Uses fakeredis so no live Redis is required.
Verifies: create, get, update, user-lock lifecycle, and not-found behaviour.
"""
from src.pdf_backend.schemas.job import JobStatus, Tier
from src.pdf_backend.services.job_store import JobStore


# ── CRUD ──────────────────────────────────────────────────────────────────────

def test_create_then_get_returns_queued_job(job_store: JobStore):
    job_store.create(
        job_id="job-1",
        document_id="doc-1",
        user_id="user-1",
        tier=Tier.free,
    )
    job = job_store.get("job-1")
    assert job is not None
    assert job.job_id == "job-1"
    assert job.document_id == "doc-1"
    assert job.status == JobStatus.queued
    assert job.tier == Tier.free
    assert job.chunk_count == 0


def test_update_status_to_processing(job_store: JobStore):
    job_store.create(job_id="job-2", document_id="doc-2", user_id="user-2", tier=Tier.pro)
    job_store.update("job-2", status=JobStatus.processing, progress_pct=10)
    job = job_store.get("job-2")
    assert job is not None
    assert job.status == JobStatus.processing
    assert job.progress_pct == 10


def test_update_status_to_done_with_chunk_count(job_store: JobStore):
    job_store.create(job_id="job-3", document_id="doc-3", user_id="user-3", tier=Tier.free)
    job_store.update("job-3", status=JobStatus.done, chunk_count=42, progress_pct=100)
    job = job_store.get("job-3")
    assert job is not None
    assert job.status == JobStatus.done
    assert job.chunk_count == 42
    assert job.progress_pct == 100


def test_get_nonexistent_job_returns_none(job_store: JobStore):
    assert job_store.get("does-not-exist") is None


def test_update_nonexistent_job_is_noop(job_store: JobStore):
    """Updating a missing job should not raise — just warn."""
    job_store.update("ghost-job", status=JobStatus.failed)  # must not raise


# ── One-job-per-user lock ──────────────────────────────────────────────────────

def test_active_job_for_user_returns_job_id(job_store: JobStore):
    job_store.create(job_id="job-A", document_id="doc-A", user_id="alice", tier=Tier.free)
    assert job_store.active_job_for_user("alice") == "job-A"


def test_active_job_for_unknown_user_returns_none(job_store: JobStore):
    assert job_store.active_job_for_user("nobody") is None


def test_delete_user_lock_releases_user(job_store: JobStore):
    job_store.create(job_id="job-B", document_id="doc-B", user_id="bob", tier=Tier.pro)
    assert job_store.active_job_for_user("bob") == "job-B"

    job_store.delete_user_lock("bob")
    assert job_store.active_job_for_user("bob") is None


def test_job_record_persists_after_user_lock_deleted(job_store: JobStore):
    """Deleting the user lock should not delete the job record."""
    job_store.create(job_id="job-C", document_id="doc-C", user_id="carol", tier=Tier.free)
    job_store.delete_user_lock("carol")
    job = job_store.get("job-C")
    assert job is not None
    assert job.status == JobStatus.queued


def test_two_users_have_independent_locks(job_store: JobStore):
    job_store.create(job_id="j1", document_id="d1", user_id="u1", tier=Tier.free)
    job_store.create(job_id="j2", document_id="d2", user_id="u2", tier=Tier.pro)
    assert job_store.active_job_for_user("u1") == "j1"
    assert job_store.active_job_for_user("u2") == "j2"

    job_store.delete_user_lock("u1")
    assert job_store.active_job_for_user("u1") is None
    assert job_store.active_job_for_user("u2") == "j2"  # u2 unaffected
