import logging
import os
import tempfile
from concurrent.futures import ProcessPoolExecutor

from unstructured.documents.elements import Element
from unstructured.partition.pdf import partition_pdf

logger = logging.getLogger(__name__)

# ── Single-threaded extraction (original) ─────────────────────────────────────

def extract_pdf_elements(pdf_path: str) -> list[Element]:
    """
    Parse a PDF into unstructured Element objects.
    Uses 'fast' strategy (pdfminer) — no Detectron2 or OCR required.
    Suitable for PDFs with an embedded text layer.
    """
    elements = partition_pdf(
        filename=pdf_path,
        infer_table_structure=True,
        strategy='fast',
        content_type='application/pdf',
        skip_infer_table_types=False,
        extract_images_in_pdf=False,
    )
    return elements


# ── Parallel extraction ────────────────────────────────────────────────────────

def _extract_page_range_worker(pdf_path: str, start_page: int, end_page: int) -> list[dict]:
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

        elements = partition_pdf(
            filename=tmp_path,
            infer_table_structure=True,
            strategy="fast",
            content_type="application/pdf",
            skip_infer_table_types=False,
            extract_images_in_pdf=False,
        )

        # Convert to dicts and shift page numbers to match the original document.
        # partition_pdf reports page 1 for the first page of the sub-PDF;
        # adding start_page (0-indexed) gives the original 1-indexed page number.
        result = []
        for el in elements:
            d = el.to_dict()
            if d.get("metadata"):
                reported = d["metadata"].get("page_number") or 1
                d["metadata"]["page_number"] = reported + start_page
            result.append(d)
        return result

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_pdf_elements_parallel(pdf_path: str, cores: int) -> list[dict]:
    """
    Parallel PDF extraction: splits the document into up to `cores` page ranges
    and processes each range in a dedicated subprocess via ProcessPoolExecutor.

    Returns element dicts (same schema as Element.to_dict()) sorted by page number.
    Falls back to single-threaded extraction when cores <= 1 or the document has
    fewer pages than the requested core count.

    Caller's process must NOT be a daemon process (daemon processes cannot spawn
    children). worker.py sets daemon=False for this reason.
    """
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)

    # Single-threaded fallback for small docs or single-core allocation
    if cores <= 1 or total_pages <= 1:
        return [el.to_dict() for el in extract_pdf_elements(pdf_path)]

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
