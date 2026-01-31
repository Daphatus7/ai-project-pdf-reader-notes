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
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// === Request Types ===

export interface CreateNoteRequest {
  project_id?: string;
  title?: string;
  content_markdown?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNoteRequest {
  title?: string;
  content_markdown?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  version: number; // Required for optimistic locking
}

// === Response Types ===

export interface ListNotesResponse {
  notes: Note[];
}

export interface NoteResponse {
  note: Note;
}

export interface DeleteNoteResponse {
  message: string;
}
