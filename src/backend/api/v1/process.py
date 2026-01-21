# @file        process.py
# @description
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import logging
import os
import uuid
import tempfile

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException

from src.backend.api.deps import get_rag_service
from src.backend.schemas.rag import RagRequest, UploadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/process', tags=['process'])

ALLOWED_TYPES = {'application/pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post('/upload/{user_id}/{project_id}', response_model=UploadResponse)
async def upload(
    user_id: str,
    project_id: str,
    file: UploadFile = File(...),
    source_name: str = Form(None),
    rag_service=Depends(get_rag_service)
):
    """
    Upload a PDF file and process it into the vector database.
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {ALLOWED_TYPES}")

    # Use filename if source_name not provided
    if not source_name:
        source_name = file.filename or f"document_{uuid.uuid4().hex[:8]}"

    # Save to temp file
    temp_path = None
    try:
        # Read and check file size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Max: {MAX_FILE_SIZE // (1024*1024)}MB")

        # Write to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(content)
            temp_path = tmp.name

        # Build request and process
        rag_request = RagRequest(
            user_id=user_id,
            project_id=project_id,
            source_name=source_name,
            file_dir=temp_path
        )

        result = rag_service.process(rag_request)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Upload failed for user {user_id}: {e}")
        return UploadResponse(
            success=False,
            message=f"Processing failed: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
    
