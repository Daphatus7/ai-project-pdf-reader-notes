/**
 * Notes API service for CRUD operations
 */

import type {
	Note,
	CreateNoteRequest,
	UpdateNoteRequest,
	ListNotesResponse,
	NoteResponse,
	DeleteNoteResponse,
} from '../note/type.ts';
import {apiConfig} from "@/frontend/api";


export const notesService = {
	/**
	 * List all notes for the authenticated user
	 */
	async listNotes(): Promise<Note[]> {
	},

	/**
	 * Get a single note by ID
	 */
	async getNote(noteId: string): Promise<Note> {
	},

	/**
	 * Create a new note
	 */
	async createNote(data: CreateNoteRequest): Promise<Note> {

	},

	/**
	 * Update a note (requires version for optimistic locking)
	 */
	async updateNote(noteId: string, data: UpdateNoteRequest): Promise<Note> {

	},

	/**
	 * Delete a note
	 */
	async deleteNote(noteId: string): Promise<DeleteNoteResponse> {

	},
};
