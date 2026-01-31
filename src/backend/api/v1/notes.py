# @file        notes.py
# @description FastAPI endpoints for notes CRUD operations
# @author      [Peiyu Wang]
# @date        30/1/2026
# @license     © 2026 . All rights reserved.
import logging
from fastapi import APIRouter, Depends, Path

from src.backend.api.deps import get_database_service, get_user
from src.backend.schemas.note import (
    ListNotesResponse,
    NoteResponse,
    CreateNoteRequest,
    CreateNoteResponse,
    UpdateNoteRequest,
    UpdateNoteResponse,
    DeleteNoteResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/notes', tags=['notes'])


@router.get('', response_model=ListNotesResponse)
async def list_notes(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    List all notes for the authenticated user.
    Returns notes ordered by updated_at descending.
    """
    user_id = user['sub']
    notes = await database_service.list_notes(user_id)
    return ListNotesResponse(notes=notes)


@router.get('/{note_id}', response_model=NoteResponse)
async def get_note(
    note_id: str = Path(..., description='Note ID to retrieve'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Get a single note by ID.
    """
    user_id = user['sub']
    note = await database_service.get_note(user_id, note_id)
    return NoteResponse(**note)


@router.post('', response_model=CreateNoteResponse)
async def create_note(
    payload: CreateNoteRequest,
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Create a new note for the authenticated user.
    """
    user_id = user['sub']
    note = await database_service.create_note(user_id, payload)
    return CreateNoteResponse(note=NoteResponse(**note))


@router.put('/{note_id}', response_model=UpdateNoteResponse)
async def update_note(
    payload: UpdateNoteRequest,
    note_id: str = Path(..., description='Note ID to update'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Update a note. Requires version for optimistic locking.
    Returns 409 Conflict if version mismatch.
    """
    user_id = user['sub']
    note = await database_service.update_note(user_id, note_id, payload)
    return UpdateNoteResponse(note=NoteResponse(**note))


@router.delete('/{note_id}', response_model=DeleteNoteResponse)
async def delete_note(
    note_id: str = Path(..., description='Note ID to delete'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Delete a note by ID.
    """
    user_id = user['sub']
    result = await database_service.delete_note(user_id, note_id)
    return DeleteNoteResponse(**result)
