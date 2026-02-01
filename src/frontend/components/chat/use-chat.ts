/**
 * @file        use-chat.ts
 * @description Custom hook for chat message handling
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import type { Message } from '../../features/llm-chat/types.ts';

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

	const sendMessage = useCallback((content: string) => {
		if (!activeThreadId || !content.trim()) return;

		addMessage(createMessage('user', content));

		// Simulate AI response (TODO: replace with actual API call)
		setIsLoading(true);
		setTimeout(() => {
			addMessage(createMessage('assistant', `This is a mock response to: "${content}"\n\nIn the real implementation, this will call the LLM API.`));
			setIsLoading(false);
		}, 1000);
	}, [activeThreadId, addMessage]);

	const selectMessage = useCallback((messageId: string) => {
		// TODO: implement message selection logic
		console.log('Selected message:', messageId);
	}, []);

	return {
		isLoading,
		sendMessage,
		selectMessage,
	};
}
