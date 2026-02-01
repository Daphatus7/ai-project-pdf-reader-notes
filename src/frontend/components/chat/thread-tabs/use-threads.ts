/**
 * @file        use-threads.ts
 * @description Custom hook for thread management
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback } from 'react';
import type { Thread, Message } from '@/frontend/features/llm-chat/types';

// ============ Helpers ============

const createThread = (id: string, title: string): Thread => ({
	id,
	title,
	createdAt: Date.now(),
	updatedAt: Date.now(),
});

const createWelcomeMessage = (): Message => ({
	id: `msg-${Date.now()}`,
	role: 'assistant',
	content: "Hello! I'm your AI assistant. How can I help you today?",
	timestamp: Date.now(),
});

// ============ Initial Data ============

const INITIAL_THREAD_ID = 'thread-1';
const INITIAL_THREADS: Thread[] = [createThread(INITIAL_THREAD_ID, 'Chat 1')];
const INITIAL_MESSAGES: Record<string, Message[]> = {
	[INITIAL_THREAD_ID]: [createWelcomeMessage()],
};

// ============ Hook ============

export function useThreads() {
	const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
	const [activeThreadId, setActiveThreadId] = useState<string | null>(INITIAL_THREADS[0]?.id || null);
	const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);

	const activeMessages = activeThreadId ? (messagesByThread[activeThreadId] || []) : [];

	const selectThread = useCallback((threadId: string) => {
		setActiveThreadId(threadId);
	}, []);

	const createNewThread = useCallback(() => {
		const newThreadId = `thread-${Date.now()}`;
		setThreads(prev => [...prev, createThread(newThreadId, `Chat ${prev.length + 1}`)]);
		setMessagesByThread(prev => ({ ...prev, [newThreadId]: [createWelcomeMessage()] }));
		setActiveThreadId(newThreadId);
	}, []);

	const deleteThread = useCallback((threadId: string) => {
		setThreads(prev => {
			const newThreads = prev.filter(t => t.id !== threadId);

			if (newThreads.length === 0) {
				const newThreadId = `thread-${Date.now()}`;
				setActiveThreadId(newThreadId);
				setMessagesByThread({ [newThreadId]: [createWelcomeMessage()] });
				return [createThread(newThreadId, 'Chat 1')];
			}

			setActiveThreadId(curr => curr === threadId ? newThreads[0].id : curr);
			setMessagesByThread(prev => {
				const { [threadId]: _, ...rest } = prev;
				return rest;
			});
			return newThreads;
		});
	}, []);

	const addMessage = useCallback((message: Message) => {
		if (!activeThreadId) return;
		setMessagesByThread(prev => ({
			...prev,
			[activeThreadId]: [...(prev[activeThreadId] || []), message],
		}));
	}, [activeThreadId]);

	return {
		threads,
		activeThreadId,
		activeMessages,
		messagesByThread,
		selectThread,
		createThread: createNewThread,
		deleteThread,
		addMessage,
		setMessagesByThread,
	};
}
