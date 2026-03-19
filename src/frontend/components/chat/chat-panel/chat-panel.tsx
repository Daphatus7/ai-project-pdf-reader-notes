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
import { Skeleton } from "@/frontend/components/ui/skeleton.tsx";
import { useLanguage } from "@/frontend/i18n/language-context";

export function ChatPanel({threadProp, messages, isLoading, isThreadsLoading, onSendMessage, onSelectContent, selectedSources, onDeselectSource }:
						  ChatPanelProps) {
	const [showThreadSidebar, setShowThreadSidebar] = useState(false);
	const { t } = useLanguage();

	return (
		<div className="flex flex-row h-full">
			<div className="flex flex-col flex-1 min-w-0">
				<div className="p-3 flex items-center gap-2 border-b justify-between h-13">
					{/*Left icons*/}
					<div className="flex items-center gap-2">
						<LucideChefHat className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">{t.chat.panelTitle}</span>
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

				{isThreadsLoading ? (
					<div className="flex-1 p-4 space-y-4">
						<div className="flex justify-start">
							<Skeleton className="h-16 w-3/4 rounded-lg" />
						</div>
						<div className="flex justify-end">
							<Skeleton className="h-10 w-1/2 rounded-lg" />
						</div>
						<div className="flex justify-start">
							<Skeleton className="h-24 w-3/4 rounded-lg" />
						</div>
					</div>
				) : (
					<ChatBubbles messages={messages} isLoading={isLoading} onSelectContent={onSelectContent} />
				)}

				<ChatBar onSend={onSendMessage} isLoading={isLoading} selectedSources={selectedSources} onDeselectSource={onDeselectSource} />
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
