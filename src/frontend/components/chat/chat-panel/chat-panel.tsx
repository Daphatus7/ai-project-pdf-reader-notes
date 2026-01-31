/**
 * chat-panel.tsx
 * @description
 *	- provide chat panel component for chat interface
 *	- purely presentational component	
 * @author      [Peiyu Wang]
 * @created    Saturday
 * @license     © 2026 . All rights reserved
 */


import { ChatBar } from '../chat-bar/chat-bar';
import { ChatBubble } from '../chat-bubble/chat-bubble';
import { AIChatBubble } from '../chat-bubble/ai-chat-bubble';
import type {LlmMessage} from "@/frontend/context/llm-chat.tsx";

export interface ChatPanelProps {
	// previous messages, AI and user
	// DI for sending message
}

export function ChatPanel (chat) = (chat : ChatPanelProps) {{
	return (
		<div className="flex flex-col h-full border rounded-lg shadow-lg overflow-hidden">

		</div>
	);
}}

	