/**
 * LLM Chat Feature Types
 * @description Type definitions for LLM chat feature
 */
import type {Thread} from "@/frontend/api/types/thread.ts";
import type {ChatMessage, UserMessage} from "@/frontend/api/types/chat.ts";
import type {ChatContent} from "@/frontend/api";

// ============ Message Types ============

/**
 * A single content item in a chat message
 * Can be text, image, or other content types
 */

// ============ Thread Types ============

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
	messages: ChatMessage[];
	isLoading: boolean;
	isThreadsLoading?: boolean;
	onSendMessage: (content: ChatContent[]) => void;
	onSelectContent?: (content: string) => void;
}

export interface ChatBubblesProps {
	messages: ChatMessage[];
	isLoading?: boolean;
	onSelectContent?: (content: string) => void;
}

export interface ChatBarProps {
	onSend: (content: ChatContent[]) => void;
	isLoading: boolean;
	placeholder?: string;
}

export interface ChatBubbleProps {
	message: ChatMessage;
}

export interface AIChatBubbleProps {
	message: ChatMessage;
	onSelectContent?: (content: string) => void;
}

// ============ Feature Props Types ============

export interface LLMChatFeatureProps {
	/** External interface to inject user messages */
	onInjectMessage?: (handler: (message: UserMessage) => void) => void;
	/** Callback when user selects content from AI response */
	onSelectContent?: (content: string) => void;
	/** Selected document IDs to use as context for LLM chat */
	sourceIds?: string[];
	/** Project ID for RAG context */
	projectId?: string | null;
}


/**
 * LLM API types matching backend Pydantic models
 */


/**
 * Content types for structured LLM responses
 */
export type ContentType = 'explanation' | 'summary' | 'answer' | 'analysis' | 'code' | 'table' | 'list';

/**
 * Code block in structured output
 */
export interface CodeBlock {
	language: string;
	code: string;
	explanation?: string;
}

/**
 * LaTeX math expression in structured output
 */
export interface MathExpression {
	latex: string;
	description?: string;
	is_block?: boolean;
}

/**
 * Section in structured output
 */
export interface Section {
	heading: string;
	content: string;
}


