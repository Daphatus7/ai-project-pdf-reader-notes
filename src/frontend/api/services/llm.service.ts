/**
 * LLM API service for chat functionality
 *
 * Provides methods for:
 * - Chat messaging
 * - Thread management (create, list, load, delete)
 */

import { post, get, del } from '../core/client';
import { apiConfig } from '../core/config';
import type {
	DeleteThreadRequest,
	DeleteThreadResponse, ListThreadsResponse,
	LoadThreadRequest,
	LoadThreadResponse, Thread
} from "@/frontend/api/types/thread.ts";
import type {InputContent} from "@/frontend/api";

import type {ChatRequest, ChatResponse} from "@/frontend/api/types/chat.ts";

/**
 * Converts data URLs to InputContent array
 */
export function convertDataUrlsToContents(messageText: string, imageUrls: string[]): InputContent[] {
	const contents: InputContent[] = [
		{ type: 'text', text: messageText }
	];

	for (const imageUrl of imageUrls) {
		const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
		if (match) {
			const mimeType = match[1] as 'image/png' | 'image/jpeg' | 'image/webp';
			const base64Data = match[2];
			contents.push({
				type: 'image',
				data: base64Data,
				mime_type: mimeType === 'image/jpeg' ? 'image/jpeg' : mimeType === 'image/webp' ? 'image/webp' : 'image/png'
			});
		}
	}

	return contents;
}

/**
 * LLM service object with all LLM-related API methods
 */
export const llmService = {
	/**
	 * Send a chat message and get response
	 */
	async chat(request: ChatRequest): Promise<ChatResponse> {
		const resp = await post<ChatResponse>(apiConfig.endpoints.llm.chat, request);
		console.log(resp);
		return resp;
	},

	/**
	 * Create a new conversation thread
	 */
	async createThread(): Promise<Thread> {
		return await post<Thread>(apiConfig.endpoints.llm.thread, {});
	},

	/**
	 * List all conversation threads for the user
	 */
	async listThreads(): Promise<ListThreadsResponse> {
		return await get<ListThreadsResponse>(apiConfig.endpoints.llm.threadList);
	},

	/**
	 * Load conversation history for a thread
	 */
	async loadThread(threadId: string): Promise<LoadThreadResponse> {
		const request: LoadThreadRequest = { thread_id: threadId };
		const resp = await post<LoadThreadResponse>(apiConfig.endpoints.llm.threadLoad, request);
		return resp;
	},

	/**
	 * Delete a conversation thread
	 */
	async deleteThread(threadId: string): Promise<DeleteThreadResponse> {
		const request: DeleteThreadRequest = { thread_id: threadId };
		return del<DeleteThreadResponse>(apiConfig.endpoints.llm.thread, request);
	},
};
