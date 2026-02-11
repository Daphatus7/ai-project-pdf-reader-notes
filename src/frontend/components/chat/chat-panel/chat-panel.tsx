/**
 * @file        chat-panel.tsx
 * @description Chat panel component containing bubbles and input bar
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState } from 'react';
import { ChatBubbles } from '../chat-bubble/chat-bubbles';
import { ChatBar } from '../chat-bar/chat-bar';
import { ThreadSidebar } from "@/frontend/components/chat/thread-sidebar/thread-sidebar.tsx";
import type {ChatPanelProps} from "@/frontend/api/types/llm.ts";
import {Button} from "@/frontend/components/ui/button.tsx";
import {LucideChefHat, LucidePlus, LucidePanelRight} from "lucide-react";

export function ChatPanel({threadProp, messages, isLoading, onSendMessage, onSelectContent }:
						  ChatPanelProps) {
	const [showThreadSidebar, setShowThreadSidebar] = useState(false);

	return (
		<div className="flex flex-row h-full">
			<div className="flex flex-col flex-1 min-w-0">
				<div className="p-3 flex items-center gap-2 border-b justify-between h-13">
					{/*Left icons*/}
					<div className="flex items-center gap-2">
						<LucideChefHat className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">Chat</span>
					</div>
					{/*Right buttons*/}
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={threadProp.onCreateThread}>
							<LucidePlus className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowThreadSidebar(!showThreadSidebar)}>
							<LucidePanelRight className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<ChatBubbles messages={messages} onSelectContent={onSelectContent} />

				<ChatBar onSend={onSendMessage} isLoading={isLoading} />
			</div>

			{showThreadSidebar && (
				<ThreadSidebar
					threads={threadProp.threads}
					activeThreadId={threadProp.activeThreadId}
					onSelectThread={threadProp.onSelectThread}
					onCreateThread={threadProp.onCreateThread}
					onDeleteThread={threadProp.onDeleteThread}
					onClose={() => setShowThreadSidebar(false)}
				/>
			)}
		</div>
	);
}
