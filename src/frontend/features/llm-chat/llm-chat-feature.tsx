/**
 * @file        llm-chat-feature.tsx
 * @description LLM Chat Feature - Container component
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Message, LLMChatFeatureProps } from './types';
import { useThreads } from '@/frontend/components/chat/thread-tabs/use-threads';
import { ChatPanel } from '@/frontend/components/chat/chat-panel/chat-panel';

// ============ Helper ============

const createMessage = (role: 'user' | 'assistant', content: string): Message => ({
	id: `msg-${Date.now()}`,
	role,
	content,
	timestamp: Date.now(),
});

// ============ Feature Component ============


export function LLMChatFeature({ onInjectMessage, onSelectContent }: LLMChatFeatureProps) {
	const {
		threads,
		activeThreadId,
		activeMessages,
		selectThread,
		createThread,
		deleteThread,
		addMessage,
	} = useThreads();
	
	const {
		sendMessage,
		selectMessage,
	} = useChat()

	const [isLoading, setIsLoading] = useState(false);

	// ---- Message Actions ----
	const handleSendMessage = useCallback((content: string) => {
		if (!activeThreadId || !content.trim()) return;

		addMessage(createMessage('user', content));

		// Simulate AI response (TODO: replace with actual API call)
		setIsLoading(true);
		setTimeout(() => {
			addMessage(createMessage('assistant', `This is a mock response to: "${content}"\n\nIn the real implementation, this will call the LLM API.`));
			setIsLoading(false);
		}, 1000);
	}, [activeThreadId, addMessage]);

	// ---- External Interface: Inject Message ----
	const injectMessage = useCallback((content: string, role: 'user' | 'assistant' = 'user') => {
		if (!activeThreadId) return;
		addMessage(createMessage(role, content));
	}, [activeThreadId, addMessage]);

	useEffect(() => {
		if (onInjectMessage) {
			onInjectMessage(injectMessage);
		}
	}, [onInjectMessage, injectMessage]);

	// ---- Render ----
	return (
		<div>
			<ChatPanel
				threadProp={{
					threads: threads,
					activeThreadId: activeThreadId,
					onSelectThread: selectThread,
					onCreateThread: createThread,
					onDeleteThread: deleteThread
				}}
				messages={activeMessages}
				isLoading={isLoading}
				onSendMessage={handleSendMessage}
				onSelectContent={onSelectContent}
			/>
		</div>
	);
}
