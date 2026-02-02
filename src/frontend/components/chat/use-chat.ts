/**
 * @file        use-chat.ts
 * @description Custom hook for chat message handling
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import { llmService } from '../../api/services/llm.service.ts';
import type { ChatMessage } from '../../api/types/chat.ts';
import type { InputContent, OutputContent } from '../../api/types/common.ts';

// ============ Helpers ============

/**
 * Create a user message with InputContent array
 */
export const createUserMessage = (contents: InputContent[]): ChatMessage => ({
	id: `msg-${Date.now()}`,
	role: 'user',
	contents: contents,
	timestamp: Date.now(),
});

/**
 * Create an assistant message with OutputContent array
 */
export const createAssistantMessage = (contents: OutputContent[]): ChatMessage => ({
	id: `msg-${Date.now()}-ai`,
	role: 'assistant',
	contents: contents,
	timestamp: Date.now(),
});

// ============ Hook ============

export function useChat(activeThreadId: string | null, addMessage: (message: ChatMessage) => void) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(async (content: string) => {
		if (!activeThreadId || !content.trim()) return;

		setError(null);
		const userContents: InputContent[] = [{ type: 'text', text: content }];
		addMessage(createUserMessage(userContents));
		setIsLoading(true);

		try {
			const response = await llmService.chat({
				thread_id: activeThreadId,
				contents: userContents,
				source_ids: [],
			});
			addMessage(createAssistantMessage(response.contents));
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
