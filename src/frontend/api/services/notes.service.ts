/**
 * Notes API service for CRUD operations
 */

import { request, post } from '../core/client';
import type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  ListNotesResponse,
  NoteResponse,
  DeleteNoteResponse,
} from '../types/note';

const NOTES_BASE = '/api/v1/notes';

export const notesService = {
  /**
   * List all notes for the authenticated user
   */
  async listNotes(): Promise<Note[]> {
    const response = await request<ListNotesResponse>(NOTES_BASE);
    return response.notes;
  },

  /**
   * Get a single note by ID
   */
  async getNote(noteId: string): Promise<Note> {
    return request<Note>(`${NOTES_BASE}/${noteId}`);
  },

  /**
   * Create a new note
   */
  async createNote(data: CreateNoteRequest): Promise<Note> {
    const response = await post<NoteResponse>(NOTES_BASE, data);
    return response.note;
  },

  /**
   * Update a note (requires version for optimistic locking)
   */
  async updateNote(noteId: string, data: UpdateNoteRequest): Promise<Note> {
    const response = await request<NoteResponse>(`${NOTES_BASE}/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<DeleteNoteResponse> {
    return request<DeleteNoteResponse>(`${NOTES_BASE}/${noteId}`, {
      method: 'DELETE',
    });
  },
};
