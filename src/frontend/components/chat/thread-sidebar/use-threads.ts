/**
 * @file        use-threads.ts
 * @description Custom hook for thread management
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useState, useCallback, useEffect } from 'react';
import { llmService } from '@/frontend/api/services/llm.service.ts';
import type {Thread} from "@/frontend/api/types/thread.ts";
import type {ChatMessage, UserMessage, AIMessage} from "@/frontend/api/types/chat.ts";


// ============ Hook ============

export function useThreads() {
	const [threads, setThreads] = useState<Thread[]>([]);
	const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
	const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const activeMessages = activeThreadId ? (messagesByThread[activeThreadId] || []) : [];

	// Load threads on mount
	useEffect(() => {
		const loadThreads = async () => {
			setIsLoading(true);
			try {
				const response = await llmService.listThreads();
				setThreads(response.threads);
				if (response.threads.length > 0) {
					setActiveThreadId(response.threads[0].thread_id);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load threads');
			} finally {
				setIsLoading(false);
			}
		};
		loadThreads();
	}, []);

	// Load messages when active thread changes
	useEffect(() => {
		if (!activeThreadId || messagesByThread[activeThreadId]) return;

		const loadMessages = async () => {
			try {
				const response = await llmService.loadThread(activeThreadId);
				setMessagesByThread(prev => ({ ...prev, [activeThreadId]: response.messages }));
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load messages');
			}
		};
		loadMessages();
	}, [activeThreadId, messagesByThread]);

	const selectThread = useCallback((threadId: string) => {
		setActiveThreadId(threadId);
	}, []);

	const createNewThread = useCallback(async () => {
		try {
			const response = await llmService.createThread();
			setThreads(prev => [...prev, response]);
			setMessagesByThread(prev => ({ ...prev, [response.thread_id]: [] }));
			setActiveThreadId(response.thread_id);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create thread');
		}
	}, []);

	const deleteThread = useCallback(async (threadId: string) => {
		try {
			await llmService.deleteThread(threadId);
			setThreads(prev => {
				const newThreads = prev.filter(t => t.thread_id !== threadId);
				if (newThreads.length === 0) {
					setActiveThreadId(null);
				} else if (activeThreadId === threadId) {
					setActiveThreadId(newThreads[0].thread_id);
				}
				return newThreads;
			});
			setMessagesByThread(prev => {
				const { [threadId]: _, ...rest } = prev;
				return rest;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete thread');
		}
	}, [activeThreadId]);

	const addUserMessage = useCallback((message: UserMessage) => {
		if (!activeThreadId) return;
		const chatMessage: ChatMessage = {
			id: `temp-${Date.now()}`,
			role: 'user',
			content: message.content,
		};
		setMessagesByThread(prev => ({
			...prev,
			[activeThreadId]: [...(prev[activeThreadId] || []), chatMessage],
		}));
	}, [activeThreadId]);

	const addAIMessage = useCallback((message: AIMessage) => {
		if (!activeThreadId) return;
		const chatMessage: ChatMessage = {
			id: message.id,
			role: 'assistant',
			content: message.content,
		}
		console.log(chatMessage)
		setMessagesByThread(prev => ({
			...prev,
			[activeThreadId]: [...(prev[activeThreadId] || []), chatMessage],
		}));
	}, [activeThreadId]);

	return {
		threads,
		activeThreadId,
		activeMessages,
		messagesByThread,
		isLoading,
		error,
		selectThread,
		createThread: createNewThread,
		deleteThread,
		addUserMessage,
		addAIMessage,
		setMessagesByThread,
	};
}
