# @file        sliding_window_chunking.py
# @description 
# @author      [Peiyu Wang]
# @date        14/1/2026
# @license     © 2026 . All rights reserved.
import asyncio
import json
import uuid
from typing import Any
from chonkie import NeuralChunker
from dataclasses import dataclass
from src.backend.schemas.rag import RagRequest
from src.backend.services.context_provider.pdf_extract import extract_pdf_elements


@dataclass
class RawContextPayload:
    payload: list[dict]
    name: str
    id:str
    dir:str
    
    

def __process_raw_to_internal_format(blocks: list[dict]) -> list[dict]:
    """
    Merge block-level extracts into one item per page.

    Expected input shape (per block):
      {
        "text": str,
        "metadata": {
          "page_number": int,
          "file_directory": str,
          "last_modified": str | int | float,
          "filetype": str,
          ... (optional)
        }
      }

    Output shape (per page):
      {
        "content": str,
        "metadata": {
          "source_id": str,
          "page_id": str,
          "source_name": str,
          "file_directory": str,
          "page_number": int,
          "last_modified": Any,
          "filetype": str
        }
      }
    """
    if not blocks:
        return []

    # Defensive: tolerate unsorted input; stable sort by page_number.
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

        # New page boundary
        if current_page_number is None or page_number != current_page_number:
            # flush previous page
            if current_page is not None:
                result.append(current_page)

            # create a new page item
            current_page_number = page_number
            current_page = {
                "content": text,
                "metadata": {
                    # caller should fill these (or pass them in via md)
                    "source_id": md.get("source_id", ""),
                    "page_id": md.get("page_id", ""),  # e.g. set later with uuid.uuid4().hex
                    "source_name": md.get("source_name", "source_name"),
                    "file_directory": md.get("file_directory", ""),
                    "page_number": page_number,
                    "last_modified": md.get("last_modified"),
                    "filetype": md.get("filetype", ""),
                },
            }
        else:
            # Same page: append content
            assert current_page is not None
            current_page["content"] += " " + text

    # flush last page
    if current_page is not None:
        result.append(current_page)

    return result

def __process_pdf(payload: RawContextPayload
                  )->list[dict]:
    #1. clean data
    cleaned_data = __process_raw_to_internal_format(payload.payload)
    
    #2. merge data into continuous text
    merged_data = ["".join(item["content"]) for item in cleaned_data]

    # with open("cleaned_data.json", "w", encoding="utf-8") as r:
    #     json.dump(merged_data, r, indent=2)
    
    #3. chunking
    chunker = NeuralChunker(
        model="mirth/chonky_modernbert_base_1",  # Default model
        device_map="cpu",                        # Device to run the model on ('cpu', 'cuda', etc.)
        min_characters_per_chunk=10,             # Minimum characters for a chunk
    )
    
    # Build chunk_content and track page boundaries
    chunk_content = ""
    page_boundaries = []  # List of (start_index, end_index, page_index) tuples
    current_index = 0
    
    for page_idx, item in enumerate(merged_data):
        page_start = current_index
        page_content = item + "\n"
        page_end = current_index + len(page_content)
        
        page_boundaries.append((page_start, page_end, page_idx))
        chunk_content += page_content
        current_index = page_end

    chunked = chunker.chunk(chunk_content)


    # todo potentially high cost process -- 2 for loops
    def get_page_numbers(chunk_start: int, chunk_end: int) -> list[int]:
        """
        Determine which pages a chunk spans based on its start and end indices.
        
        Args:
            chunk_start: Start index of the chunk in the merged content
            chunk_end: End index of the chunk in the merged content
            
        Returns:
            List of page indices (0-based) that this chunk spans
        """
        page_numbers = []
        for page_start, page_end, page_idx in page_boundaries:
            # Check if chunk overlaps with this page
            if chunk_start < page_end and chunk_end > page_start:
                page_numbers.append(page_idx)
        return page_numbers

    return_result = [
        {
            "content": c.text,
            "metadata": {
                "source_id": payload.id,
                "source_name": payload.name,
                "source_dir": payload.dir,
                "token_count": c.token_count,
                "start_index": c.start_index,
                "end_index": c.end_index,
                "page_number": get_page_numbers(c.start_index, c.end_index)
            }
        }
        for c in chunked
    ]

    return return_result 

def chonkie_chunk(rag_request: RagRequest) -> list[dict]:
    """
    Extract and chunk a PDF file from the given request.
    Returns list of chunk dicts with content and metadata.
    """
    if rag_request is None:
        raise ValueError("rag_request cannot be None")

    # Extract the file
    extracted = extract_pdf_elements(rag_request.file_dir)
    if not extracted:
        raise ValueError("No content extracted from PDF")

    chonkie_output = __process_pdf(
        payload=RawContextPayload(
            payload=[el.to_dict() for el in extracted],
            id=str(uuid.uuid4()),
            dir=rag_request.file_dir,
            name=rag_request.source_name
        )
    )

    return chonkie_output
        


# Debug, extract raw data from pdf to chonkie chunked content
# async def main():
#     # load pdf extracted raw data
#     extracted = extract_pdf_elements("pdf_extractor/exam21-final.pdf")
#     #save to json for debug
#     with open("pdf_extractor/exam21-final.json", "w", encoding="utf-8") as f:
#         json.dump([el.to_dict() for el in extracted], f, indent=2)
# 
#     output = chonkie_chunk(
#         payload = RawContextPayload(
#             payload=[el.to_dict() for el in extracted],
#             id= str(uuid.uuid4()),
#             dir= "file2",
#             name= "exam21-final"
#         )
#     )
# 
#     with open("pdf_extractor/exam21-final.json_chonkie_chunk.json", "w", encoding="utf-8") as r:
#         json.dump(output, r, indent=2, ensure_ascii=False)
# 
# if __name__ == "__main__":
#     asyncio.run(main())