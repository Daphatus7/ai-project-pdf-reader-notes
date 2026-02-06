/**
 * Notes API service for CRUD operations
 */

import type {
	Note,
	CreateNoteRequest,
	UpdateNoteRequest,
	ListNotesResponse,
	CreateNoteResponse,
	UpdateNoteResponse,
	DeleteNoteResponse,
} from '../types/note.ts';
import { get, post, put, del } from '../core/client';
import { apiConfig } from '../core/config';

const NOTES_BASE = apiConfig.endpoints.notes.base;

export const notesService = {
	/**
	 * List all notes for the authenticated user
	 */
	async listNotes(): Promise<Note[]> {
		const response = await get<ListNotesResponse>(NOTES_BASE);
		return response.notes;
	},

	/**
	 * Get a single note by ID
	 */
	async getNote(noteId: string): Promise<Note> {
		return await get<Note>(`${NOTES_BASE}/${noteId}`);
	},

	/**
	 * Create a new note
	 */
	async createNote(data: CreateNoteRequest): Promise<Note> {
		const response = await post<CreateNoteResponse>(NOTES_BASE, data);
		return response.note;
	},

	/**
	 * Update a note (requires version for optimistic locking)
	 */
	async updateNote(noteId: string, data: UpdateNoteRequest): Promise<Note> {
		console.log(data)
		const response = await put<UpdateNoteResponse>(`${NOTES_BASE}/${noteId}`, data);
		return response.note;
	},

	/**
	 * Delete a note
	 */
	async deleteNote(noteId: string): Promise<DeleteNoteResponse> {
		return await del<DeleteNoteResponse>(`${NOTES_BASE}/${noteId}`);
	},
};
