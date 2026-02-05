# @file        note.py
# @description Pydantic schemas for notes CRUD operations
# @author      [Peiyu Wang]
# @date        30/1/2026
# @license     © 2026 . All rights reserved.
from datetime import datetime
from pydantic import BaseModel

"""
    The note design seems bad, but hopefully it can achieve the intended functional needs.
"""

class CreateNoteRequest(BaseModel):
    """Request model for creating a note"""
    title: str = "Untitled Note"
    content_markdown: str = ""
    summary: str | None = None
    metadata: dict | None = None


class UpdateNoteRequest(BaseModel):
    """Request model for updating a note (requires version for optimistic locking)"""
    title: str | None = None
    content_markdown: str | None = None
    summary: str | None = None
    metadata: dict | None = None
    version: int  # Required for optimistic locking


class NoteResponse(BaseModel):
    """Single note response"""
    id: str
    user_id: str
    title: str
    content_markdown: str
    summary: str | None
    version: int
    metadata: dict | None
    created_at: datetime
    updated_at: datetime


class ListNotesResponse(BaseModel):
    """Response model for listing notes"""
    notes: list[NoteResponse]


class CreateNoteResponse(BaseModel):
    """Response model for note creation"""
    note: NoteResponse


class UpdateNoteResponse(BaseModel):
    """Response model for note update"""
    note: NoteResponse


class DeleteNoteResponse(BaseModel):
    """Response model for note deletion"""
    message: str
