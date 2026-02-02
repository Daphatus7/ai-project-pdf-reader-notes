/**
 * Public API exports
 * Single entry point for all frontend API interactions
 */

// Core
export { ApiError } from './core/errors';
export { apiConfig } from './core/config';

// Services
export { llmService, convertDataUrlsToContents } from './services/llm.service';

// Common Types
export type { TextContent, ImageContent, InputContent } from './types/common';

// LLM Types
export type {
	ContentType,
	CodeBlock,
	MathExpression,
	Section,
	
	
} from './types/llm';


export {ChatResponse} from "@/frontend/api/types/chat.ts";
export {ChatRequest} from "@/frontend/api/types/chat.ts";
