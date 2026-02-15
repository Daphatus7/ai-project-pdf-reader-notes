# @file        project.py
# @description Fast API endpoints for projects and documents management
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import os
import uuid
import tempfile

from fastapi import APIRouter, Depends, UploadFile, File, Form, Path

from src.backend.api.deps import get_rag_service, get_database_service, get_user
from src.backend.schemas.project import (
    ListProjectsResponse,
    CreateProjectResponse,
    CreateProjectRequest,
    ListDocumentsResponse,
    ProjectDeleteResponse,
    DeleteDocumentResponse,
)
from src.backend.schemas.rag import RagRequest, UploadResponse
from src.backend.schemas.error import validation_error

router = APIRouter(prefix='/projects', tags=['process'])

try:
    # Prefer configuration from config.py if available
    from config import ALLOWED_TYPES, MAX_FILE_SIZE  # type: ignore
except ImportError:
    # Fallback to defaults if config module is not available
    ALLOWED_TYPES = {'application/pdf'}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


async def read_and_validate_file(file: UploadFile, allowed_types: set, max_size: int) -> bytes:
    """Read file, validate type and size. Raises AppError on failure."""
    if file.content_type not in allowed_types:
        validation_error(f'Invalid file type. Allowed: {allowed_types}')
    content = await file.read()
    if len(content) > max_size:
        validation_error(f'File too large. Max: {max_size // (1024 * 1024)}MB')
    return content


# ==================== Projects Management ====================

@router.get('', response_model=ListProjectsResponse)
async def list_projects(
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    projects = await database_service.list_projects(user_id)
    return ListProjectsResponse(projects=projects)


@router.post('', response_model=CreateProjectResponse)
async def create_project(
        payload: CreateProjectRequest,
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    response = await database_service.create_project(user_id, payload)
    return CreateProjectResponse(response=response)


@router.delete('/{project_id}', response_model=ProjectDeleteResponse)
async def delete_project(
        project_id: str = Path(..., description='Project ID to delete'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    await database_service.delete_project(user_id, project_id)
    return ProjectDeleteResponse(response='Project deleted successfully')


# ==================== Documents Management ====================

@router.get('/{project_id}/documents', response_model=ListDocumentsResponse)
async def list_documents(
        project_id: str = Path(..., description='Project ID to list documents from'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    documents = await database_service.get_documents(user_id, project_id)
    return ListDocumentsResponse(documents=documents)


@router.post('/{project_id}/documents', response_model=UploadResponse)
async def upload_document(
        project_id: str = Path(..., description='Project ID to upload document to'),
        file: UploadFile = File(..., description='PDF file to upload'),
        user=Depends(get_user),
        source_name: str = Form(None, description='Optional custom name for the document'),
        rag_service=Depends(get_rag_service),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']

    # validate
    content = await read_and_validate_file(file, ALLOWED_TYPES, MAX_FILE_SIZE)
    source = source_name or file.filename or f"document_{uuid.uuid4().hex[:8]}"

    # Enforce document quota (increments counter for free plan)
    incremented = await database_service.enforce_quota(user_id, 'doc_count')

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(content)
            temp_path = tmp.name

        rag_request = RagRequest(
            user_id=user_id,
            project_id=project_id,
            document_name=source,
            document_dir=temp_path,
        )
        result = await rag_service.upload_document(rag_request)
        # Rollback counter if upload failed
        if not result.success and incremented:
            await database_service.decrement_usage(user_id, 'doc_count')
        return result
    except Exception:
        if incremented:
            await database_service.decrement_usage(user_id, 'doc_count')
        raise
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.delete('/{project_id}/documents/{document_id}', response_model=DeleteDocumentResponse)
async def delete_document(
        project_id: str = Path(..., description='Project ID'),
        document_id: str = Path(..., description='Document ID to delete'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    await database_service.delete_document(user_id, document_id, project_id)
    return DeleteDocumentResponse(response='Document deleted successfully')


@router.get('/{project_id}/documents/{document_id}/url')
async def get_document_url(
        project_id: str = Path(..., description='Project ID'),
        document_id: str = Path(..., description='Document ID'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    url = await database_service.get_document_url(user_id, document_id, project_id)
    return {'url': url}
