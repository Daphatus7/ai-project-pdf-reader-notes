/**
 * AI Chat Bubble Component
 * Provide chat bubble for AI messages in the chat interface
 *
 * @file        ai-chat-bubble.tsx
 * @description
 *	- provide AI chat bubble component for chat interface
 * @author      [Peiyu Wang]
 * @created    Saturday
 * @license     © 2026 . All rights reserved.
 */

export interface AIChatBubbleProps {
	// 	use DI to insert the message content
	//messages
	//DI insert for notes, leave a function here
}

export function AIChatBubble({ message }: { message: string }) {
	return (
		<div className="max-w-xl bg-gray-100 text-gray-800 p-4 rounded-lg shadow-md self-start mb-2">
			<p>{message}</p>
		</div>
	);
}