from dataclasses import dataclass
from typing import Any

from chonkie import NeuralChunker

from src.pdf_backend.schemas.rag import ProcessRequest
from src.pdf_backend.services.pdf_extract import extract_pdf_elements


@dataclass
class RawContextPayload:
    payload: list[dict]
    name: str
    dir: str


def __process_raw_to_internal_format(blocks: list[dict]) -> list[dict]:
    """Merge block-level extracts into one item per page."""
    if not blocks:
        return []

    def _page_num(b: dict[str, Any]) -> int:
        meta = b.get("metadata") or {}
        p_number = meta.get("page_number")
        if not isinstance(p_number, int):
            raise ValueError(f"Invalid or missing metadata.page_number: {p_number!r}")
        return p_number

    blocks_sorted = sorted(blocks, key=_page_num)

    result: list[dict[str, Any]] = []
    current_page_number: int | None = None
    current_page: dict[str, Any] | None = None

    for block in blocks_sorted:
        text = block.get("text", "")
        if not isinstance(text, str):
            raise ValueError(f"Invalid block.text (expected str): {text!r}")

        md = block.get("metadata") or {}
        page_number = _page_num(block)

        if current_page_number is None or page_number != current_page_number:
            if current_page is not None:
                result.append(current_page)

            current_page_number = page_number
            current_page = {
                "content": text,
                "metadata": {
                    "source_id": md.get("source_id", ""),
                    "page_id": md.get("page_id", ""),
                    "source_name": md.get("source_name", "source_name"),
                    "file_directory": md.get("file_directory", ""),
                    "page_number": page_number,
                    "last_modified": md.get("last_modified"),
                    "filetype": md.get("filetype", ""),
                },
            }
        else:
            assert current_page is not None
            current_page["content"] += " " + text

    if current_page is not None:
        result.append(current_page)

    return result


async def __process_pdf(payload: RawContextPayload) -> list[dict]:
    cleaned_data = __process_raw_to_internal_format(payload.payload)
    merged_data = ["".join(item["content"]) for item in cleaned_data]

    chunker = NeuralChunker(
        model="mirth/chonky_modernbert_base_1",
        device_map="cpu",
        min_characters_per_chunk=10,
    )

    chunk_content = ""
    page_boundaries = []
    current_index = 0

    for page_idx, item in enumerate(merged_data):
        page_start = current_index
        page_content = item + "\n"
        page_end = current_index + len(page_content)
        page_boundaries.append((page_start, page_end, page_idx))
        chunk_content += page_content
        current_index = page_end

    chunked = chunker.chunk(chunk_content)

    def get_page_numbers(chunk_start: int, chunk_end: int) -> list[int]:
        return [
            page_idx
            for page_start, page_end, page_idx in page_boundaries
            if chunk_start < page_end and chunk_end > page_start
        ]

    return [
        {
            "content": c.text,
            "metadata": {
                "document_id": "",
                "source_dir": payload.dir,
                "token_count": c.token_count,
                "start_index": c.start_index,
                "end_index": c.end_index,
                "page_number": get_page_numbers(c.start_index, c.end_index),
            },
        }
        for c in chunked
    ]


async def chonkie_chunk(rag_request: ProcessRequest, file_path: str) -> list[dict]:
    """
    Extract and chunk a PDF at file_path.
    file_path is the server-internal temp path, separate from the API contract.
    Returns list of chunk dicts.
    """
    if not file_path:
        raise ValueError("file_path cannot be empty")

    extracted = extract_pdf_elements(file_path)
    if not extracted:
        raise ValueError("No content extracted from PDF")

    return await __process_pdf(
        payload=RawContextPayload(
            payload=[el.to_dict() for el in extracted],
            dir=file_path,
            name=rag_request.document_name,
        )
    )
