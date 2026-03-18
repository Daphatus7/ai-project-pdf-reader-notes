# @file        notebooks.py
# @description FastAPI endpoints for notebooks CRUD operations
# @author      [Peiyu Wang]
# @date        2026-03-18
# @license     © 2026 . All rights reserved.
import logging

from fastapi import APIRouter, Depends, Path, HTTPException

from src.backend.api.deps import get_database_service, get_user
from src.backend.schemas.error import AppError
from src.backend.schemas.note import (
    ListNotebooksResponse,
    NotebookResponse,
    CreateNotebookRequest,
    UpdateNotebookRequest,
    DeleteNotebookResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/notebooks', tags=['notebooks'])


@router.get('', response_model=ListNotebooksResponse)
async def list_notebooks(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    List all notebooks for the authenticated user, ordered by creation date.
    """
    user_id = user['sub']
    try:
        notebooks = await database_service.list_notebooks(user_id)
        return ListNotebooksResponse(notebooks=notebooks)
    except AppError:
        raise
    except Exception as e:
        logger.error(f'list_notebooks failed for user {user_id}: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post('', response_model=NotebookResponse)
async def create_notebook(
    payload: CreateNotebookRequest,
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Create a new notebook for the authenticated user.
    """
    user_id = user['sub']
    try:
        notebook = await database_service.create_notebook(user_id, payload)
        return NotebookResponse(**notebook)
    except AppError:
        raise
    except Exception as e:
        logger.error(f'create_notebook failed for user {user_id}: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.put('/{notebook_id}', response_model=NotebookResponse)
async def update_notebook(
    payload: UpdateNotebookRequest,
    notebook_id: str = Path(..., description='Notebook ID to update'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Update a notebook's name or colour.
    """
    user_id = user['sub']
    try:
        notebook = await database_service.update_notebook(user_id, notebook_id, payload)
        return NotebookResponse(**notebook)
    except AppError:
        raise
    except Exception as e:
        logger.error(f'update_notebook failed: notebook={notebook_id} user={user_id}: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/{notebook_id}', response_model=DeleteNotebookResponse)
async def delete_notebook(
    notebook_id: str = Path(..., description='Notebook ID to delete'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Delete a notebook. Notes inside become uncategorised (notebook_id → NULL via FK cascade).
    """
    user_id = user['sub']
    try:
        result = await database_service.delete_notebook(user_id, notebook_id)
        return DeleteNotebookResponse(**result)
    except AppError:
        raise
    except Exception as e:
        logger.error(f'delete_notebook failed: notebook={notebook_id} user={user_id}: {e}')
        raise HTTPException(status_code=500, detail=str(e))
