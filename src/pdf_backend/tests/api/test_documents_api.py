"""
API tests for POST /api/v1/documents/process and GET /api/v1/documents/jobs/{job_id}.

Strategy:
- Patch module-level _job_store with a fakeredis-backed instance.
- Patch _enqueue to avoid RQ/Redis queue operations.
- Use FastAPI TestClient to send real HTTP requests through the full route handler.
- Real PDFs (test_doc1.pdf, test_doc2.pdf) pass through the actual validator.
"""
import io
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import src.pdf_backend.api.v1.documents as docs_module
from src.pdf_backend.main import app
from src.pdf_backend.schemas.job import JobStatus, Tier
from src.pdf_backend.services.job_store import JobStore


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client(fake_redis):
    """
    TestClient with patched job_store (fakeredis) and stubbed _enqueue.
    _enqueue is stubbed so tests don't need a live RQ/Redis queue.
    """
    store = JobStore(fake_redis)
    with patch.object(docs_module, "_job_store", store), \
         patch.object(docs_module, "_enqueue", return_value=None) as mock_enqueue:
        with TestClient(app, raise_server_exceptions=True) as client:
            yield client, store, mock_enqueue


# ── Health check sanity ───────────────────────────────────────────────────────

def test_health_endpoint(api_client):
    client, _, _ = api_client
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ── Successful uploads (real PDFs) ────────────────────────────────────────────

def test_upload_test_doc1_free_tier_returns_202(api_client, test_doc1_bytes):
    """test_doc1.pdf passes free-tier validation and gets a job_id."""
    client, _, mock_enqueue = api_client
    resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("test_doc1.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data={
            "document_id": "doc-1",
            "project_id": "proj-1",
            "document_name": "test_doc1.pdf",
            "user_id": "user-a",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert resp.status_code == 202
    body = resp.json()
    assert "job_id" in body
    assert body["status"] == JobStatus.queued
    mock_enqueue.assert_called_once()


def test_upload_test_doc2_pro_tier_returns_202(api_client, test_doc2_bytes):
    """test_doc2.pdf (1.2 MB) passes pro-tier validation."""
    client, _, _ = api_client
    resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("test_doc2.pdf", io.BytesIO(test_doc2_bytes), "application/pdf")},
        data={
            "document_id": "doc-2",
            "project_id": "proj-2",
            "document_name": "test_doc2.pdf",
            "user_id": "user-b",
            "tier": "pro",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert resp.status_code == 202
    body = resp.json()
    assert body["status"] == JobStatus.queued


def test_two_different_users_can_upload_concurrently(api_client, test_doc1_bytes):
    """
    Different users have independent locks; both uploads succeed.
    This simulates concurrent upload acceptance for multi-user workloads.
    """
    client, _, _ = api_client
    form_a = {
        "document_id": "doc-a",
        "project_id": "proj",
        "document_name": "doc.pdf",
        "user_id": "alice",
        "tier": "free",
        "webhook_url": "http://example.com/wh",
    }
    form_b = {**form_a, "document_id": "doc-b", "user_id": "bob"}

    resp_a = client.post(
        "/api/v1/documents/process",
        files={"file": ("doc.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data=form_a,
    )
    resp_b = client.post(
        "/api/v1/documents/process",
        files={"file": ("doc.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data=form_b,
    )

    assert resp_a.status_code == 202
    assert resp_b.status_code == 202
    assert resp_a.json()["job_id"] != resp_b.json()["job_id"]


# ── One-job-per-user policy ───────────────────────────────────────────────────

def test_second_upload_from_same_user_returns_409(api_client, test_doc1_bytes):
    """A user who already has an active job gets 409 Conflict on a second upload."""
    client, store, _ = api_client

    # Inject an existing active job for user-dup directly
    store.create(job_id="existing-job", document_id="d0", user_id="user-dup", tier=Tier.free)

    resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("t.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data={
            "document_id": "doc-new",
            "project_id": "proj",
            "document_name": "t.pdf",
            "user_id": "user-dup",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert detail["job_id"] == "existing-job"
    assert "already have a job" in detail["message"]


# ── Validation failures (422) ─────────────────────────────────────────────────

def test_wrong_content_type_returns_422(api_client):
    """Non-PDF content type triggers ValidationError → 422."""
    client, _, _ = api_client
    resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
        data={
            "document_id": "doc-x",
            "project_id": "proj-x",
            "document_name": "test.txt",
            "user_id": "user-x",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["status"] == JobStatus.not_supported
    assert "PDF" in body["message"]


def test_oversized_file_returns_422(api_client):
    """File exceeding free-tier size limit (>20 MB) → 422."""
    client, _, _ = api_client
    big = b"x" * (21 * 1024 * 1024)
    resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("big.pdf", io.BytesIO(big), "application/pdf")},
        data={
            "document_id": "doc-big",
            "project_id": "proj-big",
            "document_name": "big.pdf",
            "user_id": "user-big",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert resp.status_code == 422
    assert "20 MB" in resp.json()["message"]


def test_corrupt_pdf_returns_422(api_client):
    """Unreadable bytes → pdfminer fails → 422 not_supported."""
    client, _, _ = api_client
    resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("bad.pdf", io.BytesIO(b"this is not a pdf"), "application/pdf")},
        data={
            "document_id": "doc-bad",
            "project_id": "proj-bad",
            "document_name": "bad.pdf",
            "user_id": "user-bad",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert resp.status_code == 422
    assert "could not be read" in resp.json()["message"]


# ── Job status endpoint ───────────────────────────────────────────────────────

def test_get_job_status_returns_queued(api_client, test_doc1_bytes):
    """After a successful upload, GET /jobs/{job_id} returns queued status."""
    client, _, _ = api_client
    post_resp = client.post(
        "/api/v1/documents/process",
        files={"file": ("t.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data={
            "document_id": "doc-status",
            "project_id": "proj-status",
            "document_name": "t.pdf",
            "user_id": "user-status",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    assert post_resp.status_code == 202
    job_id = post_resp.json()["job_id"]

    get_resp = client.get(f"/api/v1/documents/jobs/{job_id}")
    assert get_resp.status_code == 200
    body = get_resp.json()
    assert body["job_id"] == job_id
    assert body["status"] == JobStatus.queued


def test_get_unknown_job_returns_404(api_client):
    client, _, _ = api_client
    resp = client.get("/api/v1/documents/jobs/nonexistent-job-id")
    assert resp.status_code == 404


# ── Priority queue routing ────────────────────────────────────────────────────

def test_pro_tier_uses_high_priority_queue(api_client, test_doc1_bytes):
    """Pro-tier uploads must be enqueued on the 'high' priority queue."""
    client, _, mock_enqueue = api_client
    client.post(
        "/api/v1/documents/process",
        files={"file": ("t.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data={
            "document_id": "doc-pro",
            "project_id": "proj-pro",
            "document_name": "t.pdf",
            "user_id": "user-pro",
            "tier": "pro",
            "webhook_url": "http://example.com/webhook",
        },
    )
    call_kwargs = mock_enqueue.call_args.kwargs
    assert call_kwargs["tier"] == Tier.pro


def test_free_tier_uses_low_priority_queue(api_client, test_doc1_bytes):
    """Free-tier uploads must be enqueued on the 'low' priority queue."""
    client, _, mock_enqueue = api_client
    client.post(
        "/api/v1/documents/process",
        files={"file": ("t.pdf", io.BytesIO(test_doc1_bytes), "application/pdf")},
        data={
            "document_id": "doc-free",
            "project_id": "proj-free",
            "document_name": "t.pdf",
            "user_id": "user-free",
            "tier": "free",
            "webhook_url": "http://example.com/webhook",
        },
    )
    call_kwargs = mock_enqueue.call_args.kwargs
    assert call_kwargs["tier"] == Tier.free
