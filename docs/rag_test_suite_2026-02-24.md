# RAG Pipeline Test Suite

**Date:** 2026-02-24
**Branch:** dev-llm-output
**Scope:** `src/pdf_backend/tests/`

---

## Overview

This document describes the automated test suite for the `pdf_backend` RAG pipeline.
The suite covers file upload validation, CPU scheduling, Redis job state, and the
extract→chunk→embed→store pipeline — all designed to run on a **12-core MacBook** without
external services (OpenAI, Supabase, Redis, or model downloads) in the default configuration.

---

## Pre-existing Bug Fixed

**`chonkie_chunker.py`** imported `RagRequest` which was renamed to `ProcessRequest` in
`schemas/rag.py`. This ImportError silently broke the entire RAG pipeline at runtime.
**Fix:** Changed `from src.pdf_backend.schemas.rag import RagRequest` →
`from src.pdf_backend.schemas.rag import ProcessRequest` and updated the type annotation.

---

## Test Structure

```
src/pdf_backend/tests/
├── conftest.py                        # Shared fixtures
├── unit/
│   ├── test_cpu_scheduler.py          # 13 tests — CPU token-bucket logic
│   └── test_validator.py              # 12 tests — File validation
├── integration/
│   ├── test_job_store.py              # 9 tests  — Redis job state CRUD
│   └── test_rag_pipeline.py           # 7 tests  — Extract→chunk→embed→store
└── api/
    └── test_documents_api.py          # 12 tests — HTTP endpoint behaviour
```

**Total: 53 tests** (51 fast, 2 marked `@pytest.mark.slow`)

---

## Running the Tests

```bash
# Install test dependencies
pip install -r src/pdf_backend/requirements-test.txt

# Run all fast tests (recommended for CI)
pytest -m "not slow"

# Run everything including real neural chunker (requires model download, ~2 min)
pytest -m slow

# Run a single layer
pytest src/pdf_backend/tests/unit/
pytest src/pdf_backend/tests/integration/
pytest src/pdf_backend/tests/api/
```

---

## CPU Scheduler Tests (12-core Mac)

The production `server_configuration.json` sets `total_cores: 30` (Railway).
Tests override this via `unittest.mock.patch` to `total_cores: 12`.

### Key scenarios verified

| Scenario | Expected behaviour |
|---|---|
| Lone free-tier job | Gets all **12 cores** (dynamic scale, not tier limit of 1) |
| Lone pro-tier job | Gets all **12 cores** (dynamic scale, not tier limit of 4) |
| Job-2 while Job-1 active | **Blocks** (0 cores available); unblocks on Job-1 release |
| After Job-1 releases | Job-2 also gets **12 cores** (active_jobs resets to 0 first) |
| active_jobs=1, 4 free cores, free tier | Gets **1 core** (tier limit applies) |
| active_jobs=1, 3 free cores, pro tier | **Blocks** (needs 4, only 3 available) |
| 3 concurrent jobs | Run **one at a time** sequentially — no core sharing on one machine |

### Design implication

On a single 12-core machine with `dynamic_scale: true`, all jobs run sequentially
(not in parallel), because the first job takes all 12 cores. True concurrency across
jobs only occurs with multiple worker **processes**.

---

## Validator Tests

Both test PDFs are validated against real tier configs via patched `server_config`:

| File | Size | Expected outcome |
|---|---|---|
| `test_doc1.pdf` | 332 KB | ✅ free tier + ✅ pro tier |
| `test_doc2.pdf` | 1.2 MB | ✅ free tier + ✅ pro tier |
| 21 MB synthetic | >20 MB | ❌ free tier (422), ✅ pro tier (hits page check) |
| 51-page synthetic | 51 pages | ❌ free tier (max 50), ✅ pro tier (max 500) |
| Invalid bytes | garbage | ❌ both tiers (unreadable PDF) |

---

## API Tests

The FastAPI `TestClient` patches `_job_store` (fakeredis-backed) and stubs `_enqueue`
so no live Redis or RQ worker is needed.

| Test | Verifies |
|---|---|
| `POST /process` — doc1, free | 202 + job_id returned, enqueue called |
| `POST /process` — doc2, pro | 202 + job_id returned |
| Two users simultaneously | Both get 202, distinct job_ids |
| Same user twice | 409 Conflict, existing job_id in body |
| Wrong content-type | 422 not_supported |
| >20 MB file (free) | 422 not_supported |
| Corrupt bytes | 422 not_supported |
| `GET /jobs/{id}` after submit | 200, status=queued |
| `GET /jobs/unknown` | 404 |
| Free tier enqueue | `tier=Tier.free` in enqueue call |
| Pro tier enqueue | `tier=Tier.pro` in enqueue call |

---

## Slow Tests (require model download)

Marked `@pytest.mark.slow`. Skip with `pytest -m "not slow"`.

- `test_real_chunking_with_test_doc1`: full pipeline with real `NeuralChunker` on `test_doc1.pdf`
- `test_real_chunking_with_test_doc2`: same for `test_doc2.pdf` (1.2 MB)

These verify that the `mirth/chonky_modernbert_base_1` model produces ≥1 chunk
from both test PDFs. OpenAI embeddings and Supabase are still mocked.

---

## Dependencies

Added to `src/pdf_backend/requirements-test.txt`:

```
pytest>=8.0.0
pytest-asyncio>=0.23.0
fakeredis>=2.23.0
httpx>=0.27.0
```
