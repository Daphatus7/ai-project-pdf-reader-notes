# @file        notes.py
# @description FastAPI endpoints for notes CRUD operations
# @author      [Peiyu Wang]
# @date        30/1/2026
# @license     © 2026 . All rights reserved.
from fastapi import APIRouter, Depends, Path, UploadFile, File, Form

from src.backend.api.deps import get_database_service, get_user
from src.backend.schemas.error import validation_error
from src.backend.schemas.note import (
    ListNotesResponse,
    NoteResponse,
    CreateNoteRequest,
    CreateNoteResponse,
    UpdateNoteRequest,
    UpdateNoteResponse,
    DeleteNoteResponse,
    ShareNoteResponse,
    UnshareNoteResponse,
)

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


@router.post('/{note_id}/share', response_model=ShareNoteResponse)
async def share_note(
    note_id: str = Path(..., description='Note ID to share'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Publish (or refresh) a public read-only snapshot of a note.
    Returns a share token; the public page lives at /share/{token}.
    """
    user_id = user['sub']
    token = await database_service.share_note(user_id, note_id)
    return ShareNoteResponse(share_token=token, share_url=f'/share/{token}')


@router.delete('/{note_id}/share', response_model=UnshareNoteResponse)
async def unshare_note(
    note_id: str = Path(..., description='Note ID to stop sharing'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Stop sharing a note. The public link becomes invalid immediately.
    """
    user_id = user['sub']
    result = await database_service.unshare_note(user_id, note_id)
    return UnshareNoteResponse(**result)


@router.get('/{note_id}/share', response_model=ShareNoteResponse | None)
async def get_share_status(
    note_id: str = Path(..., description='Note ID to check'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """
    Return the current share token for a note, or null if not shared.
    """
    user_id = user['sub']
    token = await database_service.get_note_share_token(user_id, note_id)
    if token is None:
        return None
    return ShareNoteResponse(share_token=token, share_url=f'/share/{token}')


_ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
_MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post('/images')
async def upload_note_image(
    file: UploadFile = File(..., description='Image file to upload'),
    note_id: str = Form(..., description='Note ID this image belongs to'),
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    """Upload an image for use in notes. Records in note_assets. Returns a public URL."""
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        validation_error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP')

    content = await file.read()
    if len(content) > _MAX_IMAGE_SIZE:
        validation_error('File too large. Max: 10MB')

    user_id = user['sub']
    url = await database_service.upload_note_image(
        user_id, note_id, content, file.filename or 'image', file.content_type or 'image/jpeg'
    )
    return {'url': url}
