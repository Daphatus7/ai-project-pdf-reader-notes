# @file        project.py
# @description Fast API endpoints for projects and documents management
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import logging
import os
import uuid
import tempfile

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Path

from src.backend.api.deps import get_rag_service, get_database_service, get_user
from src.backend.schemas.project import (
    ListProjectsResponse,
    CreateProjectResponse,
    CreateProjectRequest,
    ListDocumentsResponse,
    ProjectDeleteResponse,
    DeleteDocumentResponse,
    DeleteDocumentRequest
)
from src.backend.schemas.rag import RagRequest, UploadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/projects', tags=['process'])

ALLOWED_TYPES = {'application/pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


# ==================== Projects Management ====================

@router.get('', response_model=ListProjectsResponse)
async def list_projects(
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    List all projects for the authenticated user.
    """
    user_id = user['sub']
    return await database_service.list_projects(user_id)


@router.post('', response_model=CreateProjectResponse)
async def create_project(
        payload: CreateProjectRequest,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Create a new project for the authenticated user.
    """
    user_id = user['sub']
    response = await database_service.create_project(
        user_id=user_id,
        payload=payload,
    )
    return CreateProjectResponse(response=response)


@router.delete('/{project_id}', response_model=ProjectDeleteResponse)
async def delete_project(
        project_id: str = Path(..., description='Project ID to delete'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Delete a project and all associated documents.
    """
    user_id = user['sub']
    return await database_service.delete_project(user_id, project_id)


# ==================== Documents Management ====================

@router.get('/{project_id}/documents', response_model=ListDocumentsResponse)
async def list_documents(
        project_id: str = Path(..., description='Project ID to list documents from'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    List all documents in a specific project.
    """
    user_id = user['sub']
    documents = await database_service.get_documents(
        user_id=user_id,
        project_id=project_id,
    )
    return ListDocumentsResponse(documents=documents)


@router.post('/{project_id}/documents', response_model=UploadResponse)
async def upload_document(
        project_id: str = Path(..., description='Project ID to upload document to'),
        file: UploadFile = File(..., description='PDF file to upload'),
        user=Depends(get_user),
        source_name: str = Form(None, description='Optional custom name for the document'),
        rag_service=Depends(get_rag_service)
):
    """
    Upload a PDF file and process it into the vector database.
    
    File validation:
    - Type: PDF only
    - Size: Max 50MB
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid file type. Allowed: {ALLOWED_TYPES}'
        )

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
            user_id=user["sub"],
            project_id=project_id,
            source_name=source_name,
            file_dir=temp_path
        )

        result = rag_service.process(rag_request)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Upload failed for user {user["sub"]}: {e}")
        return UploadResponse(
            success=False,
            message=f"Processing failed: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@router.delete('/documents', response_model=DeleteDocumentResponse)
async def delete_document(
        payload: DeleteDocumentRequest,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Delete a document from the project and vector database.
    
    TODO: Also delete associated vectors from the vector database.
    - Could have been achieved with cascade delete in the database.
    """
    user_id = user['sub']
    
    response = await database_service.delete_document(
        user_id=user_id,
        document_id=payload.document_id,
        project_id=payload.project_id,
    )
    
    logger.info(f'Document deleted: user={user_id}, project={payload.project_id}, document={payload.document_id}')
    return DeleteDocumentResponse(response='Document deleted successfully')




            
    
