/**
 * LLM Chat Feature Types
 * @description Type definitions for LLM chat feature
 */

// ============ Message Types ============

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	hasImage?: boolean;
}

// ============ Thread Types ============

export interface Thread {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
}

// ============ Component Props Types ============

export interface ThreadTabsProps {
	threads: Thread[];
	activeThreadId: string | null;
	onSelectThread: (threadId: string) => void;
	onCreateThread: () => void;
	onDeleteThread: (threadId: string) => void;
}

export interface ChatPanelProps {
	threadProp: ThreadTabsProps;
	messages: Message[];
	isLoading: boolean;
	onSendMessage: (content: string) => void;
	onSelectContent?: (content: string) => void;
}

export interface ChatBubblesProps {
	messages: Message[];
	onSelectContent?: (content: string) => void;
}

export interface ChatBarProps {
	onSend: (content: string) => void;
	isLoading: boolean;
	placeholder?: string;
}

export interface ChatBubbleProps {
	message: Message;
}

export interface AIChatBubbleProps {
	message: Message;
	onSelectContent?: (content: string) => void;
}

// ============ Feature Props Types ============

export interface LLMChatFeatureProps {
	/** External interface to inject messages */
	onInjectMessage?: (handler: (content: string, role?: 'user' | 'assistant') => void) => void;
	/** Callback when user selects content from AI response */
	onSelectContent?: (content: string) => void;
}
