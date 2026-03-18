/**
 * @file        use-chat.ts
 * @description Custom hook for chat message handling
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import { llmService } from '../../api/services/llm.service.ts';
import type {UserMessage} from '../../api/types/chat.ts';
import type {ChatContent} from "@/frontend/api";

// ============ Hook ============

export function useChat(
	activeThreadId: string | null,
	projectId: string | null | undefined,
	addUserMessage: (message: UserMessage) => void,
	startStreamingMessage: () => void,
	appendStreamingChunk: (chunk: string) => void,
	finalizeStreamingMessage: (id: string) => void,
	updateThreadTitle: (threadId: string, title: string) => void,
	sourceIds?: string[] | undefined,
) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(async (content: ChatContent[]) => {
		if (!activeThreadId) return;

		setError(null);
		// Optimistically show user message and a streaming placeholder
		addUserMessage({ content });
		startStreamingMessage();
		setIsLoading(true);

		try {
			await llmService.chatStream(
				{ thread_id: activeThreadId,
					content: content,
					project_id: projectId ?? null,
					source_ids: sourceIds ?? [] },
				(chunk) => appendStreamingChunk(chunk),
				(id, _createdAt, _totalTokens, title) => {
					finalizeStreamingMessage(id);
					if (title && activeThreadId) updateThreadTitle(activeThreadId, title);
					setIsLoading(false);
				},
				(message) => { setError(message); setIsLoading(false); },
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send message');
			setIsLoading(false);
		}
	}, [activeThreadId, addUserMessage, startStreamingMessage, appendStreamingChunk, finalizeStreamingMessage, updateThreadTitle, sourceIds]);

	const selectMessage = useCallback((messageId: string) => {
		// console.log('Selected message:', messageId);
	}, []);

	return {
		isLoading,
		error,
		sendMessage,
		selectMessage,
	};
}
