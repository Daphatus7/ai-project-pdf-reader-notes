from pydantic import BaseModel


class ProcessRequest(BaseModel):
    """API contract for RAG processing. File is received separately via multipart."""
    document_id: str  # created by main backend, used to link vector chunks
    project_id: str
    document_name: str


class ProcessResponse(BaseModel):
    success: bool
    chunk_count: int = 0
    message: str
