import json
import logging
import os
from typing import Iterable

from chonkie import RecursiveChunker
from dotenv import load_dotenv
from unstructured.documents.elements import Element
from unstructured.partition.pdf import partition_pdf

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



def extract_pdf_elements(pdf_path: str) -> list[Element]:
    """
    Parse a PDF into unstructured Element objects.

    Assumes the PDF is readable on disk. Uses hi_res strategy to better
    capture tables and images. Raises any parsing errors to the caller.
    """
    elements = partition_pdf(
        filename=pdf_path,
        infer_table_structure=True,
        strategy='hi_res',
        content_type='application/pdf',
        skip_infer_table_types=False,
        extract_image_block_types=['Image', 'Table'],
        extract_images_in_pdf=True,
    )
    logger.info('Extracted %s raw elements from %s', len(elements), pdf_path)
    return elements

def to_json_chunks(elements: Iterable[Element]) -> list[dict]:
    """
    Convert parsed elements into JSON-serializable dictionaries.

    Assumes each Element implements to_dict provided by unstructured.
    """
    return [element.to_dict() for element in elements]


def to_markdown_chunks(elements: Iterable[Element]) -> list[str]:
    """
    Convert parsed elements into markdown strings.

    Tables keep the HTML snippet because Markdown parsers accept inline HTML.
    Other elements use their text content. Empty strings are filtered out by
    the caller when persisting.
    """
    markdown_chunks: list[str] = []
    for element in elements:
        if element.metadata and element.metadata.text_as_html:
            markdown_chunks.append(element.metadata.text_as_html)
            continue
        if element.text:
            markdown_chunks.append(element.text)
    return markdown_chunks


def to_text_chunks(elements: Iterable[Element]) -> list[str]:
    """
    Convert parsed elements into plain text strings.

    Falls back to an empty string if the element lacks text content.
    """
    return [element.text or '' for element in elements]


def save_json(output_path: str, data: list[dict]) -> None:
    """
    Persist chunk dictionaries to a JSON file with UTF-8 encoding.

    Assumes caller provides a writable path. Overwrites existing files.
    """
    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    logger.info('Saved JSON chunks to %s', output_path)


def save_lines(output_path: str, lines: list[str]) -> None:
    """
    Persist a list of text lines to disk separated by blank lines.

    Assumes caller provides a writable path. Overwrites existing files.
    """
    with open(output_path, 'w', encoding='utf-8') as file:
        file.write('\n\n'.join(filter(None, lines)))
    logger.info('Saved text-based chunks to %s', output_path)


def process_pdf(pdf_path: str):
    """
    End-to-end pipeline: parse PDF, chonkie it, and emit JSON/Markdown/Text.

    Returns:
        j_chunks: chunk dictionaries for JSON.
        m_chunks: chunk strings for Markdown.
        t_chuncks: chunk strings for plain text.
    """
    elements = extract_pdf_elements(pdf_path)

    #save elements as json
    elements_json = to_json_chunks(elements)
    save_json("elements.json", elements_json)

    #save as text
    with open("elements.txt", "w", encoding="utf-8") as f:
        for element in elements:
            f.write(element.text + "\n\n")

    # Initialize the chunker
    chunker = RecursiveChunker(
        tokenizer="character",
        chunk_size = 2000,
    )
    
    # Chunk some text
    chunks = chunker(
        "".join(elements[i].text or "" for i in range(len(elements)))
    )
    
    #save as text
    with open("chunked.txt", "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(chunk.text)


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(script_dir, 'exam21-final.pdf')

    process_pdf(pdf_path)
