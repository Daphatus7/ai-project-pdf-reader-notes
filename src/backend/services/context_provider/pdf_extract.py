# @file        embedding.py
# @description 
# @author      [Peiyu Wang]
# @date        17/1/2026
# @license     © 2026 . All rights reserved.
import json
from unstructured.documents.elements import Element
from unstructured.partition.pdf import partition_pdf

def __extract_pdf_text(path: str) -> list[Element]:
    """用 unstructured 从 PDF 提取纯文本，并拼成一个长字符串。"""
    elements = partition_pdf(
        filename=path,
        infer_table_structure=True,            # extract tables
        strategy="hi_res",                     # mandatory to infer tables
        content_type="application/pdf",
        skip_infer_table_types=False,
        extract_image_block_types=["Image","Table"],   # Add 'Table' to list to extract image of tables
        extract_images_in_pdf=True,
        # extract_image_block_to_payload=True,   # if true, will extract base64 for API usage
        # chunking_strategy="basic",          # or 'basic'
    )
    tables = [el for el in elements if el.category == "Table"]

    print(tables[0].text)
    print(tables[0].metadata.text_as_html)
    return elements

def save_chunks_to_json(chunks: list[Element], filename: str):
    """
    Save chunks extracted from unstructured to a JSON file.
    
    Args:
        chunks: List of Element objects from unstructured
        filename: Name of the output JSON file
    """
    chunks_data = []

    for index, chunk in enumerate(chunks):
        chunks_data.append(chunk.to_dict())

    # Save to JSON file
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(chunks_data, f, indent=2, ensure_ascii=False)

    print(f'Saved {len(chunks_data)} chunks to {filename}')

def extract_pdf_elements(pdf_dir: str) -> list[Element]:
    """
    Parse a PDF into unstructured Element objects.

    Assumes the PDF is readable on disk. Uses hi_res strategy to better
    capture tables and images. Raises any parsing errors to the caller.
    """
    elements = partition_pdf(
        filename=pdf_dir,
        infer_table_structure=True,
        strategy='hi_res',
        content_type='application/pdf',
        skip_infer_table_types=False,
        extract_image_block_types=['Image', 'Table'],
        extract_images_in_pdf=False,
    )
    return elements