import logging
from dataclasses import dataclass
from typing import Any

from chonkie import NeuralChunker
from docling_core.types import DoclingDocument

from src.pdf_backend.schemas.rag import ProcessRequest
from src.pdf_backend.services.pdf_extract import extract_pdf_elements, extract_pdf_elements_parallel

logger = logging.getLogger(__name__)


@dataclass
class RawContextPayload:
    payload: list[DoclingDocument]
    name: str
    dir: str

async def __chunking(payload: RawContextPayload) -> list[Any]:
    """ Convert the input to chunks"""
    chunker = NeuralChunker(
        model="mirth/chonky_modernbert_base_1",
        device_map="cpu",
        min_characters_per_chunk=10,
    )
    chunk_content = ""
    for doc in payload.payload:
        chunk_content = doc.export_to_markdown()
    chunked = chunker.chunk(chunk_content)
    return chunked


async def process_pdf_to_chunks(rag_request: ProcessRequest, file_path: str, cores: int = 1) -> list[dict]:
    """
    Extract and chunk a PDF at file_path.
    file_path is the server-internal temp path, separate from the API contract.
    cores > 1 enables parallel page-range extraction via ProcessPoolExecutor.
    Returns list of chunk dicts.
    """
    if not file_path:
        raise ValueError("file_path cannot be empty")


    logger.info("Extracting PDF (cores=%d): %s", cores, file_path)
    # Extract and aggregate to markdown
    docs: list[DoclingDocument]
    # if cores > 1:  # Parallel: each worker returns a DoclingDocument; join their markdown in order
    #     docs = extract_pdf_elements_parallel(file_path, cores)
    # else:  # single-threaded
    #     doc = extract_pdf_elements(file_path)
    #     docs = [doc]
    doc = extract_pdf_elements(file_path)
    docs = [doc]
    chunked_blocks = await __chunking(
        payload=RawContextPayload(
            payload=docs,
            dir=file_path,
            name=rag_request.document_name,
        )
    )
    return chunked_blocks
