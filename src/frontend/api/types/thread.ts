import type {ChatResponse} from "@/frontend/api/types/chat.ts";

/**
 * @file        thread.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Monday
 * @license     © 2026 . All rights reserved.
 */
/**
 * Load thread response
 */
export interface Thread {
	thread_id: string;
	title: string;
	thread_summary?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * List threads response
 */
export interface ListThreadsResponse {
	threads: Thread[];
}

/**
 * Delete thread request
 */
export interface DeleteThreadRequest {
	thread_id: string;
}

/**
 * Delete thread response
 */
export interface DeleteThreadResponse {
	response: string;
}

/**
 * Load thread request
 */
export interface LoadThreadRequest {
	thread_id: string;
}


export interface LoadThreadResponse {
	thread_id: string;
	messages: ChatResponse[];
}