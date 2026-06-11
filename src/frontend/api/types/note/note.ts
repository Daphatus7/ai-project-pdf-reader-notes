/**
 * Note types for API requests/responses
 * Aligned with backend NoteResponse schema
 */

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content_markdown: string;
  summary: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
  notebook_id: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// === Notebook Types ===

export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNotebookRequest {
  name?: string;
  color?: string;
}

export interface UpdateNotebookRequest {
  name?: string;
  color?: string;
}

export interface ListNotebooksResponse {
  notebooks: Notebook[];
}

export interface DeleteNotebookResponse {
  message: string;
}

// === Request Types ===

export interface CreateNoteRequest {
  title?: string;
  content_markdown?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  notebook_id?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content_markdown?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  version: number; // Required for optimistic locking
  notebook_id?: string | null; // null = remove from notebook
}

// === Response Types ===

export interface ListNotesResponse {
  notes: Note[];
}

export interface CreateNoteResponse {
  note: Note;
}

export interface UpdateNoteResponse {
  note: Note;
}

export interface DeleteNoteResponse {
  message: string;
}

// === Sharing Types ===

export interface ShareNoteResponse {
  share_token: string;
  share_url: string; // relative path; prepend window.location.origin
}

export interface PublicNote {
  title: string;
  content_markdown: string;
  updated_at: string; // ISO 8601
}
