/**
 * Public API exports
 * Single entry point for all frontend API interactions
 */

// Core
export { ApiError } from './core/errors';
export { apiConfig } from './core/config';

// Services
export { llmService, convertDataUrlsToContents } from './services/llm.service';

// Common Types - unified content types for all chat messages
export type { TextContent, ImageContent, ChatContent } from './types/common';

// LLM Types
export type {
	ContentType,
	CodeBlock,
	MathExpression,
	Section,
	
	
} from './types/llm';

