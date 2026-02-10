/**
 * @file        chat-panel.tsx
 * @description Chat panel component containing bubbles and input bar
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { ChatBubbles } from '../chat-bubble/chat-bubbles';
import { ChatBar } from '../chat-bar/chat-bar';
import {ThreadTabs} from "@/frontend/components/chat/thread-tabs/thread-tabs.tsx";
import type {ChatPanelProps} from "@/frontend/api/types/llm.ts";
import {LucideChefHat, LucidePlus, LucidePanelRight} from "lucide-react";

export function ChatPanel({threadProp, messages, isLoading, onSendMessage, onSelectContent }: 
						  ChatPanelProps) {
	return (
		<div className="flex justify-between flex-col h-full">
			<div className=" p-3 flex items-center gap-2 border-b justify-between">
				<div className="flex items-center gap-2">
					<LucideChefHat className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Chat</span>
				</div>
				<div className="flex items-center gap-2">
					<LucidePlus className="w-4 h-4 mr-2 cursor-pointer" onClick={threadProp.onCreateThread} />
					<LucidePanelRight className="w-4 h-4"/>
				</div>
			</div>


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
