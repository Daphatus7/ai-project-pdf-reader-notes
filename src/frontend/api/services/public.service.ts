/**
 * Public API service — unauthenticated reads of shared note snapshots.
 */

import type { PublicNote } from '../types/note/note.ts';
import { get } from '../core/client';
import { apiConfig } from '../core/config';

export const publicService = {
	/**
	 * Get a publicly shared note by its share token (no auth required)
	 */
	async getPublicNote(token: string): Promise<PublicNote> {
		return await get<PublicNote>(apiConfig.endpoints.public.note(token));
	},
};
