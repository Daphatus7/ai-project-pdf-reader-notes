/**
 * LLM Chat Feature Types
 * @description Type definitions for LLM chat feature
 */ import type {InputContent} from "@/frontend/api";

// ============ Message Types ============

/**
 * A single content item in a chat message
 * Can be text, image, or other content types
 */
export type MessageContent = InputContent;

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	/** Array of content items - supports text, images, or mixed */
	content: any|null;
	timestamp: number;
}

// ============ Thread Types ============

export interface Thread {
	thread_id: string;
	title: string;
	thread_summary?: string;
	createdAt: string;
	updatedAt: string;
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
	messages: ChatMessage[];
	isLoading: boolean;
	onSendMessage: (content: string) => void;
	onSelectContent?: (content: string) => void;
}

export interface ChatBubblesProps {
	messages: ChatMessage[];
	onSelectContent?: (content: string) => void;
}

export interface ChatBarProps {
	onSend: (content: string) => void;
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
	/** External interface to inject messages */
	onInjectMessage?: (handler: (content: string, role?: 'user' | 'assistant') => void) => void;
	/** Callback when user selects content from AI response */
	onSelectContent?: (content: string) => void;
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

/**
 * Chat request - matches backend ChatRequest schema
 */
export interface ChatRequest {
	thread_id: string;
	contents: InputContent[];
	source_ids?: string[];
}

/**
 * Chat response
 */
export interface ChatResponse {
	response: string;
}

/**
 * List threads response
 */
export interface ListThreadsResponse {
	threads: Thread[];
}

/**
 * Delete thread request
 */
export interface DeleteThreadRequest {
	thread_id: string;
}

/**
 * Delete thread response
 */
export interface DeleteThreadResponse {
	response: string;
}

/**
 * Load thread request
 */
export interface LoadThreadRequest {
	thread_id: string;
}

/**
 * Load thread response
 */
export interface LoadThreadResponse {
	messages: ChatMessage[];
}


