# @file        project.py
# @description Fast API endpoints for projects and documents management
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, UploadFile, File, Form, Path, HTTPException

from src.backend.api.deps import get_database_service, get_user
from src.backend.config.config import settings
from src.backend.schemas.project import (
    ListProjectsResponse,
    CreateProjectResponse,
    CreateProjectRequest,
    ListDocumentsResponse,
    ProjectDeleteResponse,
    DeleteDocumentResponse,
)
from src.backend.schemas.rag import UploadResponse
from src.backend.schemas.error import validation_error
from src.backend.services.llm_service.grok.grok_collection import GrokCollection

# module-level singleton
grok_collection = GrokCollection()

logger = logging.getLogger(__name__)

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
    # supabase create project
    project_id = await database_service.create_project(user_id, payload)
    # create xAI collection and store mapping
    try:
        xai_collection_id = grok_collection.create_collection(project_id)
        logger.info(f"received collection_id == {xai_collection_id}")
    except Exception as e:
        logger.error(f"create_project collection ------> {e}")
    return CreateProjectResponse(response=project_id)


@router.delete('/{project_id}', response_model=ProjectDeleteResponse)
async def delete_project(
        project_id: str = Path(..., description='Project ID to delete'),
        user=Depends(get_user),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    # get xai_collection_id before cascade delete removes it
    xai_collection_id = None
    try:
        xai_collection_id = await database_service.get_project_collection_id(user_id, project_id)
    except Exception as e:
        logger.error(f"delete_project but project not found ----> {e} ")
    # supabase delete
    await database_service.delete_project(user_id, project_id)
    # delete xAI collection (best-effort)
    if xai_collection_id:
        try:
            grok_collection.delete_collection(xai_collection_id)
        except Exception as e:
            logger.error(f"trying to delete collection but ------> {e}")
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
        database_service=Depends(get_database_service),
):
    user_id = user['sub']
    
    # supabase upload
    content = await read_and_validate_file(file, ALLOWED_TYPES, MAX_FILE_SIZE)
    source = source_name or file.filename or f"document_{uuid.uuid4().hex[:8]}"
    logger.info("[upload_document] user=%s project=%s file=%s size=%d", user_id, project_id, source, len(content))

    incremented = await database_service.enforce_quota(user_id, 'doc_count')

    # supabase upload
    try:
        document = await database_service.upload_document(
            user_id=user_id,
            project_id=project_id,
            document_name=source,
            file_data=content,
        )
        logger.info("[upload_document] stored document_id=%s", document['id'])
    except Exception:
        if incremented:
            await database_service.decrement_usage(user_id, 'doc_count')
        raise

    # collections upload (best-effort)
    try:
        xai_collection_id = await database_service.get_project_collection_id(user_id, project_id)
        grok_collection.upload_document(
            collection_id=xai_collection_id,
            name=source,
            data=content,
        )
    except Exception as e:
        logger.error(f"[upload_document] collection upload ------> {e}")

    return UploadResponse(success=True, source_id=document['id'], message="Document uploaded successfully")


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
