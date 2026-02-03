/**
 * @file        llm-chat-feature.tsx
 * @description LLM Chat Feature - Container component
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useEffect } from 'react';
import { useThreads } from '@/frontend/components/chat/thread-tabs/use-threads';
import { useChat } from '../../components/chat/use-chat.ts';
import { ChatPanel } from '@/frontend/components/chat/chat-panel/chat-panel';
import type {LLMChatFeatureProps} from "@/frontend/api/types/llm.ts";
import type {ChatMessage} from "@/frontend/api/types/chat.ts";

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
	} = useChat(activeThreadId, addMessage);

	// ---- External Interface: Inject Message ----
	const injectMessage = (chatMessage: ChatMessage) => {
		if (!activeThreadId) return;
		addMessage((chatMessage));
	};

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
