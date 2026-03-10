/**
 * LLM API service for chat functionality
 *
 * Provides methods for:
 * - Chat messaging
 * - Thread management (create, list, load, delete)
 */

import { post, get, del } from '../core/client';
import { apiConfig } from '../core/config';
import { supabase } from './supabase';
import type {
	DeleteThreadRequest,
	DeleteThreadResponse, ListThreadsResponse,
	LoadThreadRequest,
	LoadThreadResponse, Thread
} from "@/frontend/api/types/thread.ts";
import type {ChatContent} from "@/frontend/api";

import type {ChatRequest, ChatResponse} from "@/frontend/api/types/chat.ts";

/**
 * Converts data URLs to ChatContent array
 */
export function convertDataUrlsToContents(messageText: string, imageUrls: string[]): ChatContent[] {
	const contents: ChatContent[] = [
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
		return await post<ChatResponse>(apiConfig.endpoints.llm.chat, request);
	},

	/**
	 * Send a chat message with SSE streaming.
	 * Calls onChunk for each text delta, onDone when complete, onError on failure.
	 */
	async chatStream(
		request: ChatRequest,
		onChunk: (text: string) => void,
		onDone: (id: string, createdAt: string, totalTokens: number) => void,
		onError: (message: string) => void,
	): Promise<void> {
		const { data: { session } } = await supabase.auth.getSession();
		const url = `${apiConfig.baseUrl}${apiConfig.endpoints.llm.chatStream}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
			},
			body: JSON.stringify(request),
		});

		if (!response.ok || !response.body) {
			onError(`HTTP error: ${response.status}`);
			return;
		}

		// Parse SSE line-by-line from the readable stream
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const jsonStr = line.slice(6).trim();
				if (!jsonStr) continue;
				try {
					const event = JSON.parse(jsonStr);
					if (event.type === 'chunk') onChunk(event.text);
					else if (event.type === 'done') onDone(event.id, event.created_at, event.total_tokens);
					else if (event.type === 'error') onError(event.message);
				} catch { /* ignore malformed lines */ }
			}
		}
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
		console.log(resp);
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
