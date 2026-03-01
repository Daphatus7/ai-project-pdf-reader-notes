import logging
import multiprocessing
import os
import tempfile
from concurrent.futures import ProcessPoolExecutor

from docling.document_converter import DocumentConverter
from docling_core.types import DoclingDocument


logger = logging.getLogger(__name__)

# ── Single-threaded extraction (original) ─────────────────────────────────────

def extract_pdf_elements(pdf_path: str) -> DoclingDocument:
    """
    Parse a PDF into unstructured Element objects.
    Uses 'fast' strategy (pdfminer) — no Detectron2 or OCR required.
    Suitable for PDFs with an embedded text layer.
    """
    logger.info("Single-threaded extraction: %s", pdf_path)
    converter = DocumentConverter()
    doc = converter.convert(pdf_path).document
    return doc


# ── Parallel extraction ────────────────────────────────────────────────────────

def _extract_page_range_worker(pdf_path: str, start_page: int, end_page: int) -> DoclingDocument:
    """
    Top-level worker for ProcessPoolExecutor — must be module-level to be picklable.
    Writes pages [start_page, end_page) to a temp PDF, runs partition_pdf on it,
    then corrects page numbers back to the original document's numbering.
    Returns serialisable dicts (same schema as Element.to_dict()).
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

            converter = DocumentConverter()
            doc = converter.convert(pdf_path).document
            return doc
    except Exception as e:
        logger.error("Error in page range worker (%d-%d): %s", start_page, end_page, e)
    finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)


def extract_pdf_elements_parallel(pdf_path: str, cores: int) -> DoclingDocument:
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
        return extract_pdf_elements(pdf_path)

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

    # Flatten chunks and restore document order
    all_elements = [el for chunk in chunks for el in chunk]
    all_elements.sort(key=lambda d: (d.get("metadata") or {}).get("page_number") or 0)
    return all_elements
