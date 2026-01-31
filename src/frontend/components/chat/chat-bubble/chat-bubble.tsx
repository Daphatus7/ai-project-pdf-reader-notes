/**
 * @file        chat-bubble.tsx
 * @description
 *	- provide chat bubble component for chat interface
 * @author      [Peiyu Wang]
 * @created    Saturday
 * @license     © 2026 . All rights reserved.
 */


export function ChatBubble({ message, isUser }: { message: string; isUser: boolean }) {
	return (
		<div
			className={`max-w-xl p-4 rounded-lg shadow-md mb-2 ${
				isUser ? 'bg-blue-500 text-white self-end' : 'bg-gray-100 text-gray-800 self-start'
			}`}
		>
			<p>{message}</p>
		</div>
	);
}