/**
 * @file        ai-chat-bubble.tsx
 * @description AI message bubble component with selectable content
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import type { AIChatBubbleProps } from '@/frontend/features/llm-chat/types';

export function AIChatBubble({ message, onSelectContent }: AIChatBubbleProps) {
	const handleClick = () => {
		if (onSelectContent) {
			onSelectContent(message.content);
		}
	};

	return (
		<div className="flex justify-start">
			<div
				className={`max-w-[80%] bg-gray-100 text-gray-800 px-4 py-2 rounded-lg ${
					onSelectContent ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''
				}`}
				onClick={handleClick}
			>
				<p className="text-sm whitespace-pre-wrap">{message.content}</p>
			</div>
		</div>
	);
}
