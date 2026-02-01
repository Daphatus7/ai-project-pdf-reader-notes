/**
 * @file        chat-bar.tsx
 * @description Chat input bar component
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState } from 'react';
import type { ChatBarProps } from '@/frontend/features/llm-chat/types';

export function ChatBar({ onSend, isLoading, placeholder = 'Type your message...' }: ChatBarProps) {
	const [input, setInput] = useState('');

	const handleSend = () => {
		if (!input.trim() || isLoading) return;
		onSend(input.trim());
		setInput('');
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="border-t border-gray-200 p-4 bg-white">
			<div className="flex gap-2">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder={placeholder}
					disabled={isLoading}
					className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
				/>
				<button
					onClick={handleSend}
					disabled={isLoading || !input.trim()}
					className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
				>
					{isLoading ? 'Sending...' : 'Send'}
				</button>
			</div>
		</div>
	);
}
