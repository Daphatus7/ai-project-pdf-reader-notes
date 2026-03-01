from unstructured.partition.pdf import partition_pdf


from pathlib import Path
from pypdf import PdfReader
from pypdf.errors import PdfReadError


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

if __name__ == "__main__":
    
    if not is_valid_pdf("doc.pdf"):
        print("Invalid PDF file.")
    else:
        print("PDF file is valid. Proceeding with partitioning...")
        elements = partition_pdf(
            filename="doc.pdf",
            infer_table_structure=True,            # extract tables
            strategy='hi_res',
            content_type="application/pdf",
            skip_infer_table_types=False,
            extract_images_in_pdf=False,
        )
        
        for el in elements:
            print(el)
    
    