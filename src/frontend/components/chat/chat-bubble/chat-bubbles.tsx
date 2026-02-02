/**
 * @file        chat-bubbles.tsx
 * @description Container for chat message bubbles
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useRef, useEffect } from 'react';
import { ChatBubble } from './chat-bubble';
import { AIChatBubble } from './ai-chat-bubble';
import type {ChatBubblesProps} from "@/frontend/api/types/llm.ts";

export function ChatBubbles({ messages, onSelectContent }: ChatBubblesProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);
	
	return (
		<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 border border-red-500">
			{messages.map((message) =>
				message.role === 'assistant' ? (
					<AIChatBubble
						key={message.id}
						message={message}
						onSelectContent={onSelectContent}
					/>
				) : (
					<ChatBubble key={message.id} message={message} />
				)
			)}
			<div ref={messagesEndRef} />
		</div>
	);
}
