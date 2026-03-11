import logging
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, Path, HTTPException

from src.backend.api.deps import get_database_service, get_user
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
# shared module-level clients (connection pooling, concurrent-safe)
from src.backend.services.llm_service.grok import grok_collection

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
        xai_collection_id = await grok_collection.create_collection(project_id)
        await database_service.update_project_collection_id(project_id, xai_collection_id)
        logger.info(f"create_project xai_collection_id={xai_collection_id}")
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
        xai_collection_id = await database_service.get_project_collection_id(project_id)
    except Exception as e:
        logger.error(f"delete_project but project not found ----> {e} ")
    # supabase delete
    await database_service.delete_project(user_id, project_id)
    # delete xAI collection (best-effort)
    if xai_collection_id:
        try:
            await grok_collection.delete_collection(xai_collection_id)
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
    # make sure it is valid user
    user_id = user['sub']
    
    # validate
    content = await read_and_validate_file(file, ALLOWED_TYPES, MAX_FILE_SIZE)
    source = source_name or file.filename or f"document_{uuid.uuid4().hex[:8]}"
    logger.info("[upload_document] user=%s project=%s file=%s size=%d", user_id, project_id, source, len(content))

    # 1. increase usage
    incremented = await database_service.enforce_quota(user_id, 'doc_count')

    # 2. supabase upload
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

    # 3. get collection ai for the project
    try:
        # get collection id
        xai_collection_id = await database_service.get_project_collection_id(project_id)
        logger.info(f"xai_collection_id ={xai_collection_id}")
        # upload the file to xAI collection, get back xAI file_id
        xai_file_id = await grok_collection.upload_document(
            data=content,
            name=source,
            collection_id=xai_collection_id,
        )
        logger.info(f"xai_file_id ={xai_file_id}")
        # store xAI file_id in DB for future RAG lookups
        response = await database_service.update_document_xai_id(document['id'], xai_file_id)
        
        logger.info(f"upload to ai got response \n {response}")
        # 5. store the response to document xai_document_id to supabase
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

    # Fetch xAI file ID before the DB record is deleted
    xai_file_id = None
    try:
        xai_file_id = await database_service.get_collection_file_id(document_id)
    except Exception as e:
        logger.error(f"delete_document: could not fetch xai_file_id ------> {e}")
    logger.info(f"xai_file_id to delete: {xai_file_id}")
    # Delete from Supabase storage + DB
    await database_service.delete_document(user_id, document_id, project_id)

    # Remove file from xAI collection (best-effort)
    if xai_file_id:
        try:
            await grok_collection.delete_document(xai_file_id)
            logger.info("[delete_document] removed xai_file_id=%s", xai_file_id)
        except Exception as e:
            logger.error(f"delete_document: xAI file delete failed ------> {e}")

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
