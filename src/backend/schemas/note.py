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
    notebook_id: str | None = None  # Optional notebook assignment on creation


class UpdateNoteRequest(BaseModel):
    """Request model for updating a note (requires version for optimistic locking)"""
    title: str | None = None
    content_markdown: str | None = None
    summary: str | None = None
    metadata: dict | None = None
    version: int  # Required for optimistic locking
    # checked via model_fields_set: explicit None = remove from notebook
    notebook_id: str | None = None


class NoteResponse(BaseModel):
    """Single note response"""
    id: str
    user_id: str
    title: str
    content_markdown: str
    summary: str | None
    version: int
    metadata: dict | None
    notebook_id: str | None
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


# ==================== Sharing Schemas ====================

class ShareNoteResponse(BaseModel):
    """Response model for sharing a note. share_url is a relative path;
    the frontend prepends window.location.origin."""
    share_token: str
    share_url: str


class UnshareNoteResponse(BaseModel):
    """Response model for stopping a share"""
    message: str


class PublicNoteResponse(BaseModel):
    """Public-facing note snapshot. Deliberately excludes user_id, summary,
    metadata and anything else private."""
    title: str
    content_markdown: str
    updated_at: datetime


# ==================== Notebook Schemas ====================

class CreateNotebookRequest(BaseModel):
    """Request model for creating a notebook"""
    name: str = "Untitled Notebook"
    color: str | None = None


class UpdateNotebookRequest(BaseModel):
    """Request model for updating a notebook"""
    name: str | None = None
    color: str | None = None


class NotebookResponse(BaseModel):
    """Single notebook response"""
    id: str
    user_id: str
    name: str
    color: str | None
    created_at: datetime
    updated_at: datetime


class ListNotebooksResponse(BaseModel):
    """Response model for listing notebooks — wraps array to avoid bare JSON arrays"""
    notebooks: list[NotebookResponse]


class DeleteNotebookResponse(BaseModel):
    """Response model for notebook deletion"""
    message: str
