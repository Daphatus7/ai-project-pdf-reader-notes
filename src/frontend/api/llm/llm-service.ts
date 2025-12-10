/**
 * LLM API service for chat functionality.
 * 
 * Provides methods for:
 * - Regular chat (sync and async)
 * - Streaming chat
 * - Structured output chat (enforces schema-conformant responses)
 */
import { post, streamRequest } from '../client';
import { apiConfig } from '../config';
import type {
	ChatRequest,
	ChatResponse,
	StreamChatRequest,
	StructuredChatRequest,
	StructuredChatResponse,
} from './types';

export class LLMService {
	/**
	 * Synchronous chat endpoint
	 */
	async chat(request: ChatRequest): Promise<ChatResponse> {
		return post<ChatResponse>(apiConfig.endpoints.llm.chat, request);
	}

	/**
	 * Streaming chat endpoint - returns async generator
	 */
	async *chatStream(request: StreamChatRequest): AsyncGenerator<string, void, unknown> {
		yield* streamRequest(apiConfig.endpoints.llm.chatStream, request);
	}

	/**
	 * Async chat endpoint
	 */
	async chatAsync(request: ChatRequest): Promise<ChatResponse> {
		return post<ChatResponse>(apiConfig.endpoints.llm.chatAsync, request);
	}

	/**
	 * Structured output chat endpoint.
	 * 
	 * Returns responses conforming to the LLMStructuredOutput schema,
	 * making it easier to parse and display markdown, LaTeX, and GFM content.
	 * 
	 * @param request - The structured chat request
	 * @returns Structured response with content, type, sections, key points, etc.
	 */
	async chatStructured(request: StructuredChatRequest): Promise<StructuredChatResponse> {
		return post<StructuredChatResponse>(apiConfig.endpoints.llm.chatStructured, request);
	}

	/**
	 * Synchronous structured output chat endpoint.
	 * Useful for debugging and simpler use cases.
	 * 
	 * @param request - The structured chat request
	 * @returns Structured response with content, type, sections, key points, etc.
	 */
	async chatStructuredSync(request: StructuredChatRequest): Promise<StructuredChatResponse> {
		return post<StructuredChatResponse>(apiConfig.endpoints.llm.chatStructuredSync, request);
	}

	/**
	 * Streaming structured output chat endpoint.
	 * 
	 * Streams both text chunks and structured output updates.
	 * Yields objects with type 'text', 'structured', 'done', or 'error'.
	 * 
	 * @param request - The structured chat request
	 * @returns Async generator yielding stream events
	 */
	async *chatStructuredStream(request: StructuredChatRequest): AsyncGenerator<{ type: string; content?: string; data?: unknown; message?: string }, void, unknown> {
		for await (const chunk of streamRequest(apiConfig.endpoints.llm.chatStructuredStream, request)) {
			try {
				const parsed = JSON.parse(chunk);
				yield parsed;
			} catch {
				// If parsing fails, treat as plain text (backward compatibility)
				yield { type: 'text', content: chunk };
			}
		}
	}
}

// Export singleton instance
export const llmService = new LLMService();


