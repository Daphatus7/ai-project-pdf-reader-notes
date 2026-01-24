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
from src.backend.schemas.project import GetDocument, GetDocumentResponse, GetDocumentsRequest, ProjectCreateResponse, \
    CreateProjectResponse, CreateProjectRequest, ProjectDeleteResponse, DeleteDocumentResponse, DeleteDocumentRequest
from src.backend.schemas.rag import RagRequest, UploadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/projects', tags=['process'])

ALLOWED_TYPES = {'application/pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


# ==================== Projects Management ====================


# Projects Management
@router.get("/projects/get")
async def get_projects(
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    List all projects for the authenticated user.
    """
    user_id = user['sub']
    return await database_service.get_projects(user_id)

@router.patch('/project/create',response_model=CreateProjectResponse)
async def create_project(
        payload: CreateProjectRequest,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user["sub"]  # Supabase user id
    response =  await database_service.create_project(
        user_id=user_id,
        payload=payload,
    )
    return CreateProjectResponse(response=response)


@router.delete('/projects/{project_id}', response_model=ProjectDeleteResponse)
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

@router.get('/projects/{project_id}/documents', response_model=GetDocumentResponse)
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
    return GetDocumentResponse(documents=documents)


@router.post('/projects/{project_id}/documents', response_model=UploadResponse)
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

@router.delete("/documents", response_model=DeleteDocumentResponse)
async def delete_document(
        project_id: str = Path(..., description='Project ID'),
        document_id: str = Path(..., description='Document ID to delete'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    """
    Delete a document from the project and vector database.
    
    TODO: Also delete associated vectors from the vector database.
    - Could have been achieved with cascade delete in the database.
    """
    user_id = user["sub"] # 应该验证过了
    # 1) delete DB
    response = await database_service.delete_document(
        user_id=user_id,
        document_id=document_id,
        project_id=project_id,
    )
    
    logger.info(f'Document deleted: user={user_id}, project={project_id}, document={document_id}')
    return DeleteDocumentResponse(response='Document deleted successfully')




            
    
