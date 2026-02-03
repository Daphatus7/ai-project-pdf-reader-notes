/**
 * @file        llm-chat-feature.tsx
 * @description LLM Chat Feature - Container component
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useEffect, useCallback } from 'react';
import { useThreads } from '@/frontend/components/chat/thread-tabs/use-threads';
import { useChat } from '../../components/chat/use-chat.ts';
import { ChatPanel } from '@/frontend/components/chat/chat-panel/chat-panel';
import type {LLMChatFeatureProps} from "@/frontend/api/types/llm.ts";
import type {UserMessage} from "@/frontend/api/types/chat.ts";

// ============ Feature Component ============


export function LLMChatFeature({ onInjectMessage, onSelectContent }: LLMChatFeatureProps) {
	const {
		threads,
		activeThreadId,
		activeMessages,
		selectThread,
		createThread,
		deleteThread,
		addUserMessage,
		addAIMessage,
	} = useThreads();

	const {
		isLoading,
		sendMessage,
	} = useChat(activeThreadId, addUserMessage, addAIMessage);

	// ---- External Interface: Inject User Message ----
	const injectMessage = useCallback((message: UserMessage) => {
		if (!activeThreadId) return;
		addUserMessage(message);
	}, [activeThreadId, addUserMessage]);

	useEffect(() => {
		if (onInjectMessage) {
			onInjectMessage(injectMessage);
		}
	}, [onInjectMessage, injectMessage]);

	// ---- Render ----
	return (
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
	);
}
