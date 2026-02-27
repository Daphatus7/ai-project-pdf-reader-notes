# @file        project.py
# @description Fast API endpoints for projects and documents management
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, UploadFile, File, Form, Path

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


async def _submit_to_pdf_backend(
    document_id: str,
    project_id: str,
    document_name: str,
    user_id: str,
    tier: str,
    file_data: bytes,
    webhook_url: str,
) -> str | None:
    """Submit PDF to pdf_backend for chunking/embedding. Returns job_id (202) or None on failure."""
    target_url = f"{settings.pdf_backend_url}/api/v1/documents/process"
    logger.debug(
        "[pdf_backend] submitting document_id=%s size=%d bytes tier=%s webhook=%s target=%s",
        document_id, len(file_data), tier, webhook_url, target_url,
    )
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(
                f"document_id={document_id} "
                f"project_id={project_id} "
                f"document_name={document_name} "
                f"user_id={user_id}"
                f" tier={tier} webhook_url={webhook_url}"
            )
            response = await client.post(
                target_url,
                files={"file": ("document.pdf", file_data, "application/pdf")},
                data={
                    "document_id": document_id,
                    "project_id": project_id,
                    "document_name": document_name,
                    "user_id": user_id,
                    "tier": tier,
                    "webhook_url": webhook_url,
                },
            )
        logger.debug("[pdf_backend] response status=%d body=%s", response.status_code, response.text[:200])
        if response.status_code == 202:
            job_id = response.json().get("job_id")
            logger.info("[pdf_backend] job queued job_id=%s document_id=%s", job_id, document_id)
            return job_id
        logger.error(
            "[pdf_backend] unexpected status %d for document %s: %s",
            response.status_code, document_id, response.text,
        )
    except httpx.ConnectError as e:
        logger.error("[pdf_backend] connection refused — is pdf_backend running? url=%s error=%s", target_url, e)
    except httpx.TimeoutException as e:
        logger.error("[pdf_backend] request timed out after 30s for document %s: %s", document_id, e)
    except Exception as e:
        logger.error("[pdf_backend] unexpected error for document %s: %s", document_id, e, exc_info=True)
    return None


@router.post('/{project_id}/documents', response_model=UploadResponse)
async def upload_document(
        project_id: str = Path(..., description='Project ID to upload document to'),
        file: UploadFile = File(..., description='PDF file to upload'),
        user=Depends(get_user),
        source_name: str = Form(None, description='Optional custom name for the document'),
        database_service=Depends(get_database_service),
):
    user_id = user['sub']

    content = await read_and_validate_file(file, ALLOWED_TYPES, MAX_FILE_SIZE)
    source = source_name or file.filename or f"document_{uuid.uuid4().hex[:8]}"
    logger.info("[upload_document] user=%s project=%s file=%s size=%d", user_id, project_id, source, len(content))

    incremented = await database_service.enforce_quota(user_id, 'doc_count')

    try:
        document = await database_service.upload_document(
            user_id=user_id,
            project_id=project_id,
            document_name=source,
            file_data=content,
        )
        logger.debug("[upload_document] stored document_id=%s", document['id'])
    except Exception:
        if incremented:
            await database_service.decrement_usage(user_id, 'doc_count')
        raise

    # Submit to pdf_backend for RAG processing; returns job_id for SSE tracking
    job_id = None
    if settings.pdf_backend_url:
        plan = await database_service.get_user_plan(user_id)
        tier = "pro" if plan == "pro" else "free"
        webhook_url = f"{settings.backend_url}/api/v1/webhook/pdf"
        job_id = await _submit_to_pdf_backend(
            document_id=document['id'],
            project_id=project_id,
            document_name=source,
            user_id=user_id,
            tier=tier,
            file_data=content,
            webhook_url=webhook_url,
        )
    else:
        logger.debug(
            "[upload_document] RAG skipped — PDF_BACKEND_URL=%r BACKEND_URL=%r",
            settings.pdf_backend_url or "(not set)",
            settings.backend_url or "(not set)",
        )

    return UploadResponse(success=True, message="Document uploaded successfully", job_id=job_id)


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
