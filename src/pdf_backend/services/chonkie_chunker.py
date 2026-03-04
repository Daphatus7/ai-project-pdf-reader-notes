import logging
from dataclasses import dataclass

from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from docling_core.types.doc.document import DoclingDocument
from transformers import AutoTokenizer

from src.pdf_backend.schemas.rag import ProcessRequest
from src.pdf_backend.services.pdf_extract import extract_pdf_elements

logger = logging.getLogger(__name__)

# Embedding model whose tokenizer determines per-chunk token budget
EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MAX_TOKENS = 512


@dataclass
class RawContextPayload:
    payload: list[DoclingDocument]
    name: str
    dir: str


def _build_chunker() -> HybridChunker:
    """Initialise HybridChunker with a HuggingFace tokenizer budget."""
    tokenizer = HuggingFaceTokenizer(
        tokenizer=AutoTokenizer.from_pretrained(EMBED_MODEL_ID),
        max_tokens=MAX_TOKENS,
    )
    # merge_peers=True: adjacent same-level sibling chunks are merged
    # when they fit within the token budget, reducing redundant context
    return HybridChunker(tokenizer=tokenizer, merge_peers=True)


def _chunk_docs(payload: RawContextPayload) -> list[dict]:
    """
    Chunk every DoclingDocument in the payload using document structure as
    ground truth.

    HybridChunker splits on the native heading/section hierarchy first,
    then further splits oversized pieces by token count — so boundaries
    respect the PDF layout rather than arbitrary character windows.

    Each dict contains:
      - text: raw chunk text (no heading prefix)
      - contextualized_text: heading breadcrumb + text, ready for embedding
      - meta: serialisable chunk metadata (page refs, label path, …)
    """
    chunker = _build_chunker()
    results: list[dict] = []

    for doc in payload.payload:
        for chunk in chunker.chunk(dl_doc=doc):
            # contextualize() prepends the section heading path so the
            # embedded text carries positional context even when retrieved
            # out of order
            contextualized = chunker.contextualize(chunk=chunk)
            results.append({
                "text": chunk.text,
                "contextualized_text": contextualized,
                "meta": chunk.meta.export_json_dict() if chunk.meta else {},
            })

    return results


async def process_pdf_to_chunks(rag_request: ProcessRequest, file_path: str, cores: int = 1) -> list[dict]:
    """
    Extract and chunk a PDF at file_path.
    file_path is the server-internal temp path, separate from the API contract.
    Returns list of chunk dicts with text, contextualized_text, and meta.
    """
    if not file_path:
        raise ValueError("file_path cannot be empty")

    logger.info("Extracting PDF (cores=%d): %s", cores, file_path)
    doc = extract_pdf_elements(file_path)

    chunks = _chunk_docs(
        RawContextPayload(
            payload=[doc],
            dir=file_path,
            name=rag_request.document_name,
        )
    )
    logger.info("Produced %d chunks from: %s", len(chunks), file_path)
    return chunks
