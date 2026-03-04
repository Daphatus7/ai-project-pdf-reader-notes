from pathlib import Path
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from docling_core.types.doc.document import DoclingDocument
from transformers import AutoTokenizer

# Embedding model used for tokenization-aware chunking.
# Chunk boundaries are aligned to the model's max token budget.
EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MAX_TOKENS = 512


def is_valid_pdf(path: str) -> bool:
    file = Path(path)

    # 1. File exists
    if not file.exists() or not file.is_file():
        return False

    # 2. Check PDF magic header
    with open(file, "rb") as f:
        header = f.read(5)
        if header != b"%PDF-":
            return False

    # 3. Try parsing
    try:
        reader = PdfReader(path, strict=True)
        _ = len(reader.pages)  # force parsing
        return True
    except PdfReadError:
        return False
    except Exception:
        return False


def chunk_document(doc: DoclingDocument) -> list[dict]:
    """
    Hybrid-chunk a DoclingDocument using its native structure as ground truth.

    HybridChunker splits on document hierarchy (headings, sections, tables)
    first, then further splits oversized chunks by token count — so chunk
    boundaries respect the original PDF structure rather than arbitrary
    character/sentence windows.

    Each returned dict contains:
      - text: the chunk text (plain, no heading prefix)
      - contextualized_text: heading-prefixed text suitable for embedding
      - meta: serialisable chunk metadata from docling
    """
    # Tokenizer sets the per-chunk token budget understood by the embedding model
    tokenizer = HuggingFaceTokenizer(
        tokenizer=AutoTokenizer.from_pretrained(EMBED_MODEL_ID),
        max_tokens=MAX_TOKENS,
    )

    # merge_peers=True merges adjacent same-level sibling chunks that fit
    # within the token budget, reducing redundant context repetition
    chunker = HybridChunker(tokenizer=tokenizer, merge_peers=True)
    chunks = list(chunker.chunk(dl_doc=doc))

    results = []
    for chunk in chunks:
        # contextualize() prepends the heading breadcrumb path so that
        # the embedded text carries section context even out of order
        contextualized = chunker.contextualize(chunk=chunk)
        results.append({
            "text": chunk.text,
            "contextualized_text": contextualized,
            "meta": chunk.meta.export_json_dict() if chunk.meta else {},
        })
    return results


if __name__ == "__main__":
    from docling.document_converter import DocumentConverter
    path = "doc.pdf"
    if not is_valid_pdf(path):
        print("Invalid PDF file.")
    else:
        # Convert PDF → DoclingDocument (structural ground truth)
        converter = DocumentConverter()
        doc = converter.convert(path).document

        # Save raw docling JSON for inspection
        with open("doc.json", "w") as f:
            f.write(doc.model_dump_json())

        # Chunk using document structure + token budget
        chunks = chunk_document(doc)
        print(f"Total chunks: {len(chunks)}\n")
        for i, c in enumerate(chunks):
            print(f"=== Chunk {i} ===")
            print(f"text ({len(c['text'])} chars):\n{c['text'][:300]!r}")
            print(f"contextualized:\n{c['contextualized_text'][:300]!r}")
            print()