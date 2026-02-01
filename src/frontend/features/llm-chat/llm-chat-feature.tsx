/**
 * @file        llm-chat-feature.tsx
 * @description LLM Chat Feature - Container component
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useEffect, useCallback } from 'react';
import type { Message, LLMChatFeatureProps } from './types';
import { useThreads } from '@/frontend/components/chat/thread-tabs/use-threads';
import { useChat, createMessage } from './use-chat';
import { ChatPanel } from '@/frontend/components/chat/chat-panel/chat-panel';

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
		isLoading,
		sendMessage,
		selectMessage,
	} = useChat(activeThreadId, addMessage);

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
				onSendMessage={sendMessage}
				onSelectContent={onSelectContent}
			/>
		</div>
	);
}
