/**
 * Public API exports
 */
export { llmService, LLMService } from './llm/llm-service';
export type {
	ChatRequest,
	ChatResponse,
	StreamChatRequest,
	StructuredChatRequest,
	StructuredChatResponse,
	LLMStructuredOutput,
	ContentType,
	CodeBlock,
	MathExpression,
	Section,
} from './llm/types';
export { ApiError } from './client';
export { apiConfig } from './config';


