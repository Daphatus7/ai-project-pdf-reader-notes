import logging
import multiprocessing
import os
import tempfile
from concurrent.futures import ProcessPoolExecutor

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc.document import DoclingDocument


logger = logging.getLogger(__name__)


# ── Shared DocumentConverter factory ──────────────────────────────────────────

def _make_converter() -> DocumentConverter:
    """
    Build a DocumentConverter with OCR disabled.
    OCR (RapidOCR) is skipped because uploaded PDFs have embedded text layers;
    disabling it avoids downloading ~300 MB of model weights at runtime.
    """
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False
    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )


# ── Single-threaded extraction (original) ─────────────────────────────────────

def extract_pdf_elements(pdf_path: str) -> DoclingDocument:
    """
    Parse a PDF into unstructured Element objects.
    Uses 'fast' strategy (pdfminer) — no Detectron2 or OCR required.
    Suitable for PDFs with an embedded text layer.
    """
    logger.info("Single-threaded extraction: %s", pdf_path)
    doc = _make_converter().convert(pdf_path).document
    return doc


# ── Parallel extraction ────────────────────────────────────────────────────────

def _extract_page_range_worker(pdf_path: str, start_page: int, end_page: int) -> DoclingDocument:
    """
    Top-level worker for ProcessPoolExecutor — must be module-level to be picklable.
    Writes pages [start_page, end_page) to a temporary PDF and converts it with
    Docling DocumentConverter (OCR disabled).
    Returns a DoclingDocument for the extracted page range.
    """
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    for i in range(start_page, end_page):
        writer.add_page(reader.pages[i])

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            writer.write(tmp)
            tmp_path = tmp.name

        # Convert the sliced temp PDF (not the original) with Docling
        doc = _make_converter().convert(tmp_path).document
        return doc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_pdf_elements_parallel(pdf_path: str, cores: int) -> list[DoclingDocument]:
    """
    Parallel PDF extraction: splits the document into up to `cores` page ranges
    and processes each range in a dedicated subprocess via ProcessPoolExecutor.
    """
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)

    # Single-threaded fallback for small docs, single-core, or daemon processes.
    # Daemon processes (e.g. RQ job forks) cannot spawn children via ProcessPoolExecutor.
    if cores <= 1 or total_pages <= 1 or multiprocessing.current_process().daemon:
        if multiprocessing.current_process().daemon:
            logger.warning("Running in daemon process — falling back to single-threaded extraction")
        return [extract_pdf_elements(pdf_path)]

    # Clamp cores to the actual number of pages
    actual_cores = min(cores, total_pages)

    # Distribute pages as evenly as possible across workers
    chunk_size = total_pages // actual_cores
    ranges: list[tuple[int, int]] = []
    for i in range(actual_cores):
        start = i * chunk_size
        end = start + chunk_size if i < actual_cores - 1 else total_pages
        ranges.append((start, end))

    logger.info(
        "Parallel PDF extraction: %d cores, %d pages, ranges=%s",
        actual_cores, total_pages, ranges,
    )

    with ProcessPoolExecutor(max_workers=actual_cores) as executor:
        futures = [
            executor.submit(_extract_page_range_worker, pdf_path, start, end)
            for start, end in ranges
        ]
        chunks = [f.result() for f in futures]

    # Return documents in page-range order for the caller to aggregate
    return chunks
