# Background PDF Submission — Decoupled Upload Architecture

**Date:** 2026-03-02  
**Feature area:** `src/backend/api/v1/project.py`, `src/backend/api/v1/documents.py`

## Problem

The original `upload_document` endpoint submitted the PDF to `pdf_backend` inline — meaning the HTTP response was blocked until `pdf_backend` accepted the job (up to 30 s client timeout). If `pdf_backend` was slow or temporarily unavailable, every file upload appeared to hang or fail from the user's perspective, even though the document was already safely stored in the database.

## Solution

The submission to `pdf_backend` is now scheduled as a **FastAPI `BackgroundTask`**:

```
Upload request
     │
     ├─ validate + store document in DB  (blocking — fast, local)
     │
     ├─ pre-generate local_job_id        (instant)
     │
     └─ return UploadResponse immediately   ← user sees "upload complete"
             │
             └─ [background] _submit_to_pdf_backend(...)
                       │
                       └─ pdf_backend calls webhook with local_job_id → SSE push
```

### `local_job_id` tracking

Because we return before `pdf_backend` assigns its own `job_id`, we pre-generate a UUID (`local_job_id`) and embed it as a query parameter in the webhook callback URL:

```
{BACKEND_URL}/api/v1/webhook/pdf?local_job_id=<uuid>
```

When `pdf_backend` finishes and calls the webhook, the handler reads `local_job_id` from the query string and uses it as the SSE channel key — matching exactly what was returned to the frontend.

`payload.job_id` (pdf_backend's own ID) is used as a fallback for any existing clients that call the webhook without the new query parameter.

## Trade-offs

| | Before | After |
|---|---|---|
| Upload response time | Blocked until pdf_backend responds (≤ 30 s) | Immediate (< 1 s typical) |
| pdf_backend outage impact | Upload appears to fail | Upload succeeds; RAG processing deferred |
| Error visibility | HTTP error returned to user | Errors logged server-side; SSE stream stays silent |
| Complexity | Simple linear flow | Background task + pre-generated ID handoff |

## Error handling

Errors inside `_submit_to_pdf_backend` (connection refused, timeout, unexpected status) are logged at `ERROR` level but do not surface to the user. The document is already stored in the database, so it is safe to retry the submission separately if needed.
