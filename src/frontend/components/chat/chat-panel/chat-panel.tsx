/**
 * @file        chat-panel.tsx
 * @description Chat panel component containing bubbles and input bar
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import type { ChatPanelProps } from '@/frontend/features/llm-chat/types';
import { ChatBubbles } from '../chat-bubble/chat-bubbles';
import { ChatBar } from '../chat-bar/chat-bar';
import {ThreadTabs} from "@/frontend/components/chat/thread-tabs/thread-tabs.tsx";

export function ChatPanel({threadProp, messages, isLoading, onSendMessage, onSelectContent }: 
						  ChatPanelProps) {
	return (
		<div className="flex flex-col h-full bg-white">
			{/* Messages area */}
			<ChatBubbles messages={messages} onSelectContent={onSelectContent} />
			
			<ThreadTabs
				threads={threadProp.threads}
				activeThreadId={threadProp.activeThreadId}
				onSelectThread={threadProp.onSelectThread}
				onCreateThread={threadProp.onCreateThread}
				onDeleteThread={threadProp.onDeleteThread}
			/>
			{/* Input bar */}
			<ChatBar onSend={onSendMessage} isLoading={isLoading} />
		</div>
	);
}
