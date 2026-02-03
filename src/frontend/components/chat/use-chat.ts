/**
 * @file        use-chat.ts
 * @description Custom hook for chat message handling
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import { llmService } from '../../api/services/llm.service.ts';
import type {UserMessage, AIMessage} from '../../api/types/chat.ts';

// ============ Hook ============

export function useChat(
	activeThreadId: string | null,
	addUserMessage: (message: UserMessage) => void,
	addAIMessage: (message: AIMessage) => void
) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(async (content: string) => {
		if (!activeThreadId || !content.trim()) return;

		setError(null);
		const userContents = [{ type: 'text' as const, text: content }];

		// Add user message immediately (optimistic update)
		addUserMessage({ content: userContents });
		setIsLoading(true);

		try {
			const response = await llmService.chat({
				thread_id: activeThreadId,
				content: userContents,
				source_ids: [],
			});
			// Add AI message with backend ID
			addAIMessage({
				id: response.id,
				content: response.content,
			});
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [activeThreadId, addUserMessage, addAIMessage]);

	const selectMessage = useCallback((messageId: string) => {
		console.log('Selected message:', messageId);
	}, []);

	return {
		isLoading,
		error,
		sendMessage,
		selectMessage,
	};
}
