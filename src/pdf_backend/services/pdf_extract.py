from unstructured.documents.elements import Element
from unstructured.partition.pdf import partition_pdf


def extract_pdf_elements(pdf_dir: str) -> list[Element]:
    """
    Parse a PDF into unstructured Element objects.
    Uses 'fast' strategy (pdfminer) — no Detectron2 or OCR required.
    Suitable for PDFs with an embedded text layer.
    """
    elements = partition_pdf(
        filename=pdf_dir,
        infer_table_structure=True,
        strategy='fast',
        content_type='application/pdf',
        skip_infer_table_types=False,
        extract_images_in_pdf=False,
    )
    return elements
