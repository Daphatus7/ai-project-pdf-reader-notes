/**
 * @file        chat-bar.tsx
 * @description Chat input bar with Cursor-style source context chips
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState } from 'react';
import { FileText, X, Send } from 'lucide-react';
import type {ChatBarProps} from "@/frontend/api/types/llm.ts";
import { useLanguage } from "@/frontend/i18n/language-context";

export function ChatBar({ onSend, isLoading, placeholder, selectedSources, onDeselectSource }: ChatBarProps) {
	const [input, setInput] = useState('');
	const { t } = useLanguage();
	/* Fall back to translated default when caller omits the placeholder prop */
	const effectivePlaceholder = placeholder ?? t.chat.placeholder;

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
		/* Container: uses CSS variables to follow light/dark mode */
		<div className="border-t border-border bg-panel">
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
								aria-label={t.chat.removeSource.replace('{name}', source.name)}
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
					placeholder={effectivePlaceholder}
					disabled={isLoading}
					/* bg-panel + text-foreground ensure correct colors in both modes */
					className="flex-1 px-4 py-2 border border-border bg-panel text-foreground placeholder:text-muted-foreground rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
				/>
				<button
					onClick={handleSend}
					disabled={isLoading || !input.trim()}
					/* Active: blue brand color; disabled: muted instead of hardcoded gray */
					className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors text-sm"
				>
					<Send className="h-3.5 w-3.5" />
					{isLoading ? t.chat.sending : t.chat.send}
				</button>
			</div>
		</div>
	);
}
