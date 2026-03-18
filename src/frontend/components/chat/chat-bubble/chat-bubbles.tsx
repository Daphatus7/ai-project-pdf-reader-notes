/**
 * @file        chat-bubbles.tsx
 * @description Container for chat message bubbles
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useRef, useEffect, useCallback } from 'react';
import { ChatBubble } from './chat-bubble';
import { AIChatBubble } from './ai-chat-bubble';
import type {ChatBubblesProps} from "@/frontend/api/types/llm.ts";

export function ChatBubbles({ messages, isLoading, onSelectContent }: ChatBubblesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	// Whether user is near bottom — if they scrolled up, leave them alone
	const shouldAutoScrollRef = useRef(true);

	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		shouldAutoScrollRef.current = distanceFromBottom < 80;
	}, []);

	// Reset lock when a new stream starts so it follows the new message
	useEffect(() => {
		if (isLoading) shouldAutoScrollRef.current = true;
	}, [isLoading]);

	// During streaming use instant (no animation) to avoid bounce; smooth only when stream finishes
	useEffect(() => {
		if (!shouldAutoScrollRef.current) return;
		messagesEndRef.current?.scrollIntoView({
			behavior: isLoading ? 'instant' : 'smooth',
		});
	}, [messages, isLoading]);

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
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
