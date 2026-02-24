import io
import logging

from fastapi import UploadFile
from pdfminer.high_level import extract_pages

from src.pdf_backend.schemas.job import Tier
from src.pdf_backend.services.server_config import get_tier_config

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when a submitted file fails tier validation."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


async def validate_pdf(file: UploadFile, tier: Tier) -> bytes:
    """
    Validate the uploaded file against tier limits.
    Returns raw file bytes on success.
    Raises ValidationError with a user-facing message on failure.
    """
    cfg = get_tier_config(tier)
    max_bytes = int(cfg["max_file_size_mb"]) * 1024 * 1024
    max_pages = int(cfg["max_pages"])

    # Check content type
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise ValidationError("Only PDF files are supported.")

    content = await file.read()

    # Check file size
    if len(content) > max_bytes:
        raise ValidationError(
            f"File exceeds the {cfg['max_file_size_mb']} MB limit for {tier} tier."
        )

    # Check page count via pdfminer (fast, no full parse)
    try:
        page_count = sum(1 for _ in extract_pages(io.BytesIO(content)))
    except Exception as exc:
        logger.warning("Could not determine page count: %s", exc)
        raise ValidationError("File could not be read. Ensure it is a valid, non-encrypted PDF.")

    if page_count > max_pages:
        raise ValidationError(
            f"PDF has {page_count} pages, which exceeds the {max_pages}-page limit for {tier} tier."
        )

    return content
