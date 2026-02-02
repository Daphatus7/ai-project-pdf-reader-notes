/**
 * @file        chat-bubble.tsx
 * @description User message bubble component
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */
import type {ChatBubbleProps} from "@/frontend/api/types/llm.ts";


export function ChatBubble({ message }: ChatBubbleProps) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[80%] bg-blue-500 px-4 py-2 rounded-lg">
				<p
				className="text-sm"
				>{message.content[0]}</p>
			</div>
		</div>
	);
}
