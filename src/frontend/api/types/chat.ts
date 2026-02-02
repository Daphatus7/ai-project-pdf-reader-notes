import type {InputContent} from "@/frontend/api";

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	/** Array of content items - supports text, images, or mixed */
	content: any | null;
	timestamp: number;
}

/**
 * Chat request - matches backend ChatRequest schema
 */
export interface ChatRequest {
	thread_id: string;
	contents: InputContent[];
	source_ids?: string[];
}

/**
 * @file        chat.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Monday
 * @license     © 2026 . All rights reserved.
 */
/**
 * Chat response
 */
export interface ChatResponse {
	response: Record<string, unknown>[];
}