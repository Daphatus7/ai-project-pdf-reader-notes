/**
 * Notebooks API service for CRUD operations
 */

import type {
	Notebook,
	CreateNotebookRequest,
	UpdateNotebookRequest,
	ListNotebooksResponse,
	DeleteNotebookResponse,
} from '../types/note/note.ts';
import { get, post, put, del } from '../core/client';
import { apiConfig } from '../core/config';

const NOTEBOOKS_BASE = apiConfig.endpoints.notebooks.base;

export const notebooksService = {
	/**
	 * List all notebooks for the authenticated user
	 */
	async listNotebooks(): Promise<Notebook[]> {
		const response = await get<ListNotebooksResponse>(NOTEBOOKS_BASE);
		return response.notebooks;
	},

	/**
	 * Create a new notebook
	 */
	async createNotebook(data: CreateNotebookRequest): Promise<Notebook> {
		return await post<Notebook>(NOTEBOOKS_BASE, data);
	},

	/**
	 * Update a notebook's name or colour
	 */
	async updateNotebook(notebookId: string, data: UpdateNotebookRequest): Promise<Notebook> {
		return await put<Notebook>(`${NOTEBOOKS_BASE}/${notebookId}`, data);
	},

	/**
	 * Delete a notebook — notes inside become uncategorised
	 */
	async deleteNotebook(notebookId: string): Promise<DeleteNotebookResponse> {
		return await del<DeleteNotebookResponse>(`${NOTEBOOKS_BASE}/${notebookId}`);
	},
};
