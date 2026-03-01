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
    from docling.document_converter import DocumentConverter
    path ="doc.pdf"
    if not is_valid_pdf("doc.pdf"):
        print("Invalid PDF file.")
    else:
        converter = DocumentConverter()
        doc = converter.convert(path).document
        #save as json
        with open("doc.json", "w") as f:
            f.write(doc.json())
        print(doc.export_to_markdown())