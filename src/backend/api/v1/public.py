# @file        public.py
# @description Unauthenticated public endpoints for shared note snapshots.
#              SECURITY: this router must never query private tables — it only
#              reads from shared_notes (explicitly published snapshots).
# @author      [Peiyu Wang]
# @date        11/6/2026
# @license     © 2026 . All rights reserved.
from fastapi import APIRouter, Depends, Path

from src.backend.api.deps import get_database_service
from src.backend.schemas.note import PublicNoteResponse

router = APIRouter(prefix='/public', tags=['public'])


@router.get('/notes/{token}', response_model=PublicNoteResponse)
async def get_public_note(
    token: str = Path(..., description='Share token of the published note'),
    database_service=Depends(get_database_service),
):
    """
    Get a publicly shared note snapshot by its share token.
    No authentication required; returns 404 for unknown/revoked tokens.
    """
    note = await database_service.get_public_note(token)
    return PublicNoteResponse(**note)
