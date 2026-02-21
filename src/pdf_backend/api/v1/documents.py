import logging
import os
import tempfile

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from src.pdf_backend.schemas.rag import ProcessRequest, ProcessResponse
from src.pdf_backend.services.rag_service import RagService

logger = logging.getLogger(__name__)
router = APIRouter()

_rag_service = RagService()


@router.on_event("startup")
async def startup():
    _rag_service.start()


@router.post("/process", response_model=ProcessResponse)
async def process_document(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    project_id: str = Form(...),
    document_name: str = Form(...),
):
    """
    Receive a PDF and run the full RAG pipeline:
    extract → chunk → embed → store to vector DB.

    Storage and document record management are the main backend's responsibility.
    """
    request = ProcessRequest(
        document_id=document_id,
        project_id=project_id,
        document_name=document_name,
    )

    # Write to a temp file — internal concern, not exposed in the API contract
    suffix = os.path.splitext(file.filename or "upload")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        success, chunk_count, message = await _rag_service.process(
            document_id=request.document_id,
            project_id=request.project_id,
            document_name=request.document_name,
            file_path=tmp_path,
        )
    finally:
        os.unlink(tmp_path)

    if not success:
        raise HTTPException(status_code=500, detail=message)

    return ProcessResponse(success=True, chunk_count=chunk_count, message=message)
