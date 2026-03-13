/**
 * @file        chat-bar.tsx
 * @description Chat input bar with Cursor-style source context chips
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState } from 'react';
import { FileText, X, Send } from 'lucide-react';
import type {ChatBarProps} from "@/frontend/api/types/llm.ts";

export function ChatBar({ onSend, isLoading, placeholder = 'Type your message...', selectedSources, onDeselectSource }: ChatBarProps) {
	const [input, setInput] = useState('');

	const handleSend = () => {
		if (!input.trim() || isLoading) return;

		// pack to chat content format
		onSend([{ type: 'text', text: input.trim() }]);
		setInput('');
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="border-t border-gray-200 bg-white">
			{/* Cursor-style context chips: shows selected sources above input */}
			{selectedSources && selectedSources.length > 0 && (
				<div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1">
					{selectedSources.map(source => (
						<span
							key={source.id}
							className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-md border border-border max-w-[200px]"
						>
							<FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
							<span className="truncate">@{source.name}</span>
							<button
								onClick={() => onDeselectSource?.(source.id)}
								className="shrink-0 ml-0.5 hover:text-destructive transition-colors"
								aria-label={`Remove ${source.name}`}
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					))}
				</div>
			)}

			{/* Input row */}
			<div className="flex gap-2 p-3">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder={placeholder}
					disabled={isLoading}
					className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
				/>
				<button
					onClick={handleSend}
					disabled={isLoading || !input.trim()}
					className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
				>
					<Send className="h-3.5 w-3.5" />
					{isLoading ? 'Sending...' : 'Send'}
				</button>
			</div>
		</div>
	);
}
