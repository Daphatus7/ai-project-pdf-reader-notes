import type {InputContent, OutputContent} from "@/frontend/api";
/**
 * @file        chat.ts
 * @description Chat types matching backend Pydantic models
 *
 * @author      [Peiyu Wang]
 * @created    Monday
 * @license     © 2026 . All rights reserved.
 */

/**
 * Chat message with multimodal content support
 */
export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	/** Array of content items - supports text, images, or mixed */
	contents: InputContent[] | OutputContent[];
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
 * Chat response - matches backend ChatResponse schema
 */
export interface ChatResponse {
	contents: OutputContent[];
}