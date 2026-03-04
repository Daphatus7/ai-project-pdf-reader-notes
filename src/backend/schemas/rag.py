# @file        rag.py
# @description
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
from typing import Optional
from pydantic import BaseModel


class RagRequest(BaseModel):
    """
        Request to upload a pdf as context for RAG.
    """
    user_id: str
    project_id: str
    document_name: str
    document_dir: str  # temp file path on server


class UploadResponse(BaseModel):
    """
        Response after uploading and processing the pdf.
    """
    success: bool
    source_id: Optional[str] = None
    chunk_count: int = 0
    message: str
    # job_id is set when pdf_backend accepted the processing job; use it for SSE tracking
    job_id: Optional[str] = None


class RagDeleteRequest(BaseModel):
    """
        Request to delete the rag context from the vector database.
    """
    user_id: str
    project_id: str
    source_id: str


class RagDeleteResponse(BaseModel):
    """
        Response from deleting the rag.
    """
    success: bool
    message: str