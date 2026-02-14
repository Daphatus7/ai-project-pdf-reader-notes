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

export function ChatBubbles({ messages, isLoading, onSelectContent }: ChatBubblesProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when messages update or loading state changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, isLoading]);


	return (
		<div
			className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
			style={{ contain: 'strict' }}
		>
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
			{isLoading && <ThinkingIndicator />}
			<div ref={messagesEndRef} />
		</div>
	);
}

function ThinkingIndicator() {
	return (
		<div className="flex justify-start">
			<div className="px-4 py-3 rounded-lg flex items-center gap-1.5">
				<span className="thinking-dot size-2 rounded-full bg-muted-foreground/60" />
				<span className="thinking-dot size-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '0.15s' }} />
				<span className="thinking-dot size-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '0.3s' }} />
			</div>
		</div>
	);
}
