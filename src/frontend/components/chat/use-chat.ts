/**
 * @file        use-chat.ts
 * @description Custom hook for chat message handling
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import { llmService } from '../../api/services/llm.service.ts';
import type {ChatMessage} from '../../api/types/chat.ts';

// ============ Helpers ============


// ============ Hook ============

export function useChat(activeThreadId: string, addMessage: (userMessage: ChatMessage) => void) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(async (content: string) => {
		if (!activeThreadId || !content.trim()) return;

		setError(null);
		const userContents = [{ type: 'text', text: content }];
		const chatMessage : ChatMessage = {
			role: 'user',
			contents: userMessage.contents
		};
		addMessage(chatMessage);
		setIsLoading(true);

		try {
			const response = await llmService.chat({
				thread_id: activeThreadId,
				contents: userContents,
				source_ids: [],
			});
			const response_message: ChatMessage = {
				id: 'msg-' + Date.now(),
				role: 'assistant',
				contents: response.contents,
				timestamp: Date.now(),
			}; 
			addMessage(response_message);
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
