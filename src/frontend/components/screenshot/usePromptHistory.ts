import { useState, useCallback } from 'react';

const STORAGE_KEY = 'screenshot-prompt-history';
const MAX_ITEMS = 5;

export interface PromptHistoryItem {
	prompt: string;
	label: string;
}

// Derive a short display label from the first 3 words of the prompt
function deriveLabel(prompt: string): string {
	const words = prompt.trim().split(/\s+/).slice(0, 3).join(' ');
	return words.length > 20 ? words.slice(0, 20) + '…' : words;
}

function load(): PromptHistoryItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as PromptHistoryItem[]) : [];
	} catch {
		return [];
	}
}

function save(items: PromptHistoryItem[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function usePromptHistory() {
	const [history, setHistory] = useState<PromptHistoryItem[]>(load);

	// Push a new prompt to the top; dedup by prompt text, trim to MAX_ITEMS
	const push = useCallback((prompt: string) => {
		const trimmed = prompt.trim();
		if (!trimmed) return;

		setHistory((prev) => {
			// Remove existing entry with the same prompt (dedup)
			const filtered = prev.filter((item) => item.prompt !== trimmed);
			const next = [{ prompt: trimmed, label: deriveLabel(trimmed) }, ...filtered].slice(
				0,
				MAX_ITEMS,
			);
			save(next);
			return next;
		});
	}, []);

	return { history, push };
}
