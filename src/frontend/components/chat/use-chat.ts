/**
 * @file        use-chat.ts
 * @description Custom hook for chat message handling
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import type { Message } from '../../features/llm-chat/types.ts';
import { llmService } from '../../api/services/llm.service.ts';

// ============ Helpers ============

export const createMessage = (role: 'user' | 'assistant', content: string): Message => ({
	id: `msg-${Date.now()}`,
	role,
	content,
	timestamp: Date.now(),
});

// ============ Hook ============

export function useChat(activeThreadId: string | null, addMessage: (message: Message) => void) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(async (content: string) => {
		if (!activeThreadId || !content.trim()) return;

		setError(null);
		addMessage(createMessage('user', content));
		setIsLoading(true);

		try {
			const response = await llmService.chat({
				thread_id: activeThreadId,
				contents: [{ type: 'text', text: content }],
				source_ids: [],
			});
			addMessage(createMessage('assistant', response.response));
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [activeThreadId, addMessage]);

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
