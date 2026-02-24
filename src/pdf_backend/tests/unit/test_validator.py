"""
Unit tests for validate_pdf().

Covers: content-type gate, file-size limits, page-count limits (both tiers),
corrupt/unreadable PDF, and real-file acceptance for test_doc1.pdf / test_doc2.pdf.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.pdf_backend.schemas.job import Tier
from src.pdf_backend.services.validator import ValidationError, validate_pdf


# ── Helper ────────────────────────────────────────────────────────────────────

def make_upload(content: bytes, content_type: str = "application/pdf") -> MagicMock:
    """Create a minimal FastAPI UploadFile mock."""
    mock = MagicMock()
    mock.content_type = content_type
    mock.read = AsyncMock(return_value=content)
    return mock


# ── Content-type gate ─────────────────────────────────────────────────────────

async def test_rejects_non_pdf_content_type():
    upload = make_upload(b"some text", content_type="text/plain")
    with pytest.raises(ValidationError) as exc_info:
        await validate_pdf(upload, Tier.free)
    assert "Only PDF files are supported" in exc_info.value.message


async def test_accepts_application_octet_stream(test_doc1_bytes):
    """Some clients send PDFs as octet-stream; we allow it."""
    upload = make_upload(test_doc1_bytes, content_type="application/octet-stream")
    result = await validate_pdf(upload, Tier.free)
    assert isinstance(result, bytes)
    assert len(result) == len(test_doc1_bytes)


# ── File-size limits ──────────────────────────────────────────────────────────

async def test_rejects_oversized_file_free_tier():
    big = b"x" * (21 * 1024 * 1024)  # 21 MB > 20 MB free limit
    upload = make_upload(big)
    with pytest.raises(ValidationError) as exc_info:
        await validate_pdf(upload, Tier.free)
    assert "20 MB" in exc_info.value.message


async def test_rejects_oversized_file_pro_tier():
    big = b"x" * (101 * 1024 * 1024)  # 101 MB > 100 MB pro limit
    upload = make_upload(big)
    with pytest.raises(ValidationError) as exc_info:
        await validate_pdf(upload, Tier.pro)
    assert "100 MB" in exc_info.value.message


async def test_accepts_file_within_pro_tier_but_above_free_limit(test_doc1_bytes):
    """A file that would be too large for free tier still passes on pro tier."""
    # Simulate a 25 MB file: patch size check by providing exact content
    twenty_five_mb = b"%PDF-1.4 " + b"0" * (25 * 1024 * 1024)
    upload = make_upload(twenty_five_mb)
    # Should fail for free (>20 MB) but reach page-count step for pro
    with pytest.raises(ValidationError) as exc_info:
        await validate_pdf(upload, Tier.free)
    assert "20 MB" in exc_info.value.message

    # For pro: size check passes; pdfminer will fail on fake bytes, but
    # that raises a different ValidationError (unreadable), not size
    upload2 = make_upload(twenty_five_mb)
    with pytest.raises(ValidationError) as exc_info2:
        await validate_pdf(upload2, Tier.pro)
    assert "could not be read" in exc_info2.value.message


# ── Page-count limits ─────────────────────────────────────────────────────────

async def test_rejects_pdf_exceeding_free_page_limit(test_doc1_bytes):
    """Patch extract_pages to report 51 pages → fails free tier (max 50)."""
    upload = make_upload(test_doc1_bytes)
    with patch(
        "src.pdf_backend.services.validator.extract_pages",
        return_value=iter([object()] * 51),
    ):
        with pytest.raises(ValidationError) as exc_info:
            await validate_pdf(upload, Tier.free)
    assert "51 pages" in exc_info.value.message
    assert "50" in exc_info.value.message


async def test_accepts_51_pages_on_pro_tier(test_doc1_bytes):
    """51-page PDF should pass pro tier (limit=500)."""
    upload = make_upload(test_doc1_bytes)
    with patch(
        "src.pdf_backend.services.validator.extract_pages",
        return_value=iter([object()] * 51),
    ):
        result = await validate_pdf(upload, Tier.pro)
    assert result == test_doc1_bytes


async def test_rejects_pdf_exceeding_pro_page_limit(test_doc1_bytes):
    """601-page PDF exceeds pro limit (500)."""
    upload = make_upload(test_doc1_bytes)
    with patch(
        "src.pdf_backend.services.validator.extract_pages",
        return_value=iter([object()] * 601),
    ):
        with pytest.raises(ValidationError) as exc_info:
            await validate_pdf(upload, Tier.pro)
    assert "601 pages" in exc_info.value.message


# ── Corrupt / unreadable PDFs ─────────────────────────────────────────────────

async def test_rejects_corrupt_bytes():
    junk = b"not a real pdf at all"
    upload = make_upload(junk)
    with pytest.raises(ValidationError) as exc_info:
        await validate_pdf(upload, Tier.free)
    assert "could not be read" in exc_info.value.message


async def test_rejects_when_pdfminer_raises(test_doc1_bytes):
    """Any unexpected exception from pdfminer is wrapped as ValidationError."""
    upload = make_upload(test_doc1_bytes)
    with patch(
        "src.pdf_backend.services.validator.extract_pages",
        side_effect=RuntimeError("unexpected failure"),
    ):
        with pytest.raises(ValidationError) as exc_info:
            await validate_pdf(upload, Tier.free)
    assert "could not be read" in exc_info.value.message


# ── Real PDF acceptance (test_doc1.pdf and test_doc2.pdf) ─────────────────────

async def test_doc1_passes_free_tier_validation(test_doc1_bytes):
    """test_doc1.pdf (332 KB) should pass free tier."""
    upload = make_upload(test_doc1_bytes)
    result = await validate_pdf(upload, Tier.free)
    assert result == test_doc1_bytes


async def test_doc1_passes_pro_tier_validation(test_doc1_bytes):
    upload = make_upload(test_doc1_bytes)
    result = await validate_pdf(upload, Tier.pro)
    assert result == test_doc1_bytes


async def test_doc2_passes_free_tier_validation(test_doc2_bytes):
    """test_doc2.pdf (1.2 MB) should pass free tier."""
    upload = make_upload(test_doc2_bytes)
    result = await validate_pdf(upload, Tier.free)
    assert result == test_doc2_bytes


async def test_doc2_passes_pro_tier_validation(test_doc2_bytes):
    upload = make_upload(test_doc2_bytes)
    result = await validate_pdf(upload, Tier.pro)
    assert result == test_doc2_bytes
