"""
Integration tests for RagService (extract → chunk → embed → store).

External dependencies (OpenAI, Supabase, NeuralChunker) are mocked so the
test can run offline without API keys or model downloads.

Slow tests that exercise the real neural chunker are marked @pytest.mark.slow
and skipped in normal CI runs: pytest -m "not slow"
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.pdf_backend.services.rag_service import RagService


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _fake_chunks(n: int = 3) -> list[dict]:
    return [
        {
            "content": f"Chunk {i} content",
            "metadata": {
                "token_count": 80 + i,
                "start_index": i * 100,
                "end_index": (i + 1) * 100,
                "page_number": [i],
            },
        }
        for i in range(n)
    ]


def _build_service(mock_supabase: MagicMock, mock_emb: MagicMock) -> RagService:
    """Return a RagService with pre-injected mock clients (skips start())."""
    svc = RagService()
    svc._supabase = mock_supabase
    svc._embedding_model = mock_emb
    return svc


@pytest.fixture
def mock_supabase() -> MagicMock:
    sb = MagicMock()
    # Simulate a successful insert returning 3 rows
    sb.table.return_value.insert.return_value.execute.return_value.data = [{}] * 3
    return sb


@pytest.fixture
def mock_embeddings() -> MagicMock:
    emb = MagicMock()
    # Return a 1536-dim vector per chunk
    emb.embed_documents.side_effect = lambda texts: [[0.1] * 1536] * len(texts)
    return emb


# ── Happy path ────────────────────────────────────────────────────────────────

async def test_process_returns_success_with_chunk_count(mock_supabase, mock_embeddings):
    svc = _build_service(mock_supabase, mock_embeddings)
    chunks = _fake_chunks(3)

    with patch(
        "src.pdf_backend.services.rag_service.chonkie_chunk",
        new_callable=AsyncMock,
        return_value=chunks,
    ):
        success, count, msg = await svc.process(
            document_id="doc-1",
            project_id="proj-1",
            document_name="test.pdf",
            file_path="/tmp/test.pdf",
        )

    assert success is True
    assert count == 3
    assert "3 chunks" in msg


async def test_store_to_vector_sends_correct_payload(mock_supabase, mock_embeddings):
    """_store_to_vector must include all required fields in the Supabase insert."""
    svc = _build_service(mock_supabase, mock_embeddings)
    chunks = _fake_chunks(2)
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{}] * 2

    svc._store_to_vector("doc-42", "proj-99", chunks)

    # Inspect what was passed to insert()
    call_args = mock_supabase.table.return_value.insert.call_args
    documents: list[dict] = call_args[0][0]
    assert len(documents) == 2

    for doc in documents:
        assert doc["document_id"] == "doc-42"
        assert doc["project_id"] == "proj-99"
        assert "content" in doc
        assert "embedding" in doc
        assert len(doc["embedding"]) == 1536


# ── Failure paths ─────────────────────────────────────────────────────────────

async def test_process_returns_failure_when_chunking_raises(mock_supabase, mock_embeddings):
    svc = _build_service(mock_supabase, mock_embeddings)

    with patch(
        "src.pdf_backend.services.rag_service.chonkie_chunk",
        new_callable=AsyncMock,
        side_effect=ValueError("pdfminer parse error"),
    ):
        success, count, msg = await svc.process(
            document_id="doc-2",
            project_id="proj-2",
            document_name="bad.pdf",
            file_path="/tmp/bad.pdf",
        )

    assert success is False
    assert count == 0
    assert "PDF extraction/chunking failed" in msg


async def test_process_returns_failure_when_no_chunks_extracted(mock_supabase, mock_embeddings):
    svc = _build_service(mock_supabase, mock_embeddings)

    with patch(
        "src.pdf_backend.services.rag_service.chonkie_chunk",
        new_callable=AsyncMock,
        return_value=[],  # empty
    ):
        success, count, msg = await svc.process(
            document_id="doc-3",
            project_id="proj-3",
            document_name="empty.pdf",
            file_path="/tmp/empty.pdf",
        )

    assert success is False
    assert count == 0
    assert "No content extracted" in msg


async def test_process_returns_failure_when_vector_storage_raises(mock_supabase, mock_embeddings):
    svc = _build_service(mock_supabase, mock_embeddings)
    mock_supabase.table.side_effect = RuntimeError("Supabase connection error")

    with patch(
        "src.pdf_backend.services.rag_service.chonkie_chunk",
        new_callable=AsyncMock,
        return_value=_fake_chunks(2),
    ):
        success, count, msg = await svc.process(
            document_id="doc-4",
            project_id="proj-4",
            document_name="test.pdf",
            file_path="/tmp/test.pdf",
        )

    assert success is False
    assert "Vector storage failed" in msg


# ── Slow: real chunker (requires model download) ──────────────────────────────

@pytest.mark.slow
async def test_real_chunking_with_test_doc1(test_doc1_path, mock_supabase, mock_embeddings):
    """
    End-to-end pipeline with real PDF extraction and NeuralChunker.
    Skipped in CI; run with: pytest -m slow
    """
    svc = _build_service(mock_supabase, mock_embeddings)

    success, _, _ = await svc.process(
        document_id="real-doc-1",
        project_id="real-proj",
        document_name="test_doc1.pdf",
        file_path=str(test_doc1_path),
    )

    # Verify real chunking happened: insert() must have been called with ≥1 document
    assert success is True
    insert_call = mock_supabase.table.return_value.insert.call_args
    assert insert_call is not None, "No chunks were inserted — extraction may have failed"
    docs_inserted: list = insert_call[0][0]
    assert len(docs_inserted) > 0


@pytest.mark.slow
async def test_real_chunking_with_test_doc2(test_doc2_path, mock_supabase, mock_embeddings):
    """Same as above but with the larger test_doc2.pdf (1.2 MB)."""
    svc = _build_service(mock_supabase, mock_embeddings)

    success, _, _ = await svc.process(
        document_id="real-doc-2",
        project_id="real-proj",
        document_name="test_doc2.pdf",
        file_path=str(test_doc2_path),
    )

    assert success is True
    insert_call = mock_supabase.table.return_value.insert.call_args
    assert insert_call is not None, "No chunks were inserted — extraction may have failed"
    docs_inserted: list = insert_call[0][0]
    assert len(docs_inserted) > 0
