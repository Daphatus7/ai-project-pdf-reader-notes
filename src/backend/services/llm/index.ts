/**
 * LLM Service - Frontend Interface
 * 
 * This module provides the frontend interface for LLM functionality.
 * All actual LLM processing is handled by the backend service.
 */

// Export the main chat service interface
export { RealChatService } from './chat_service.ts';

// Export client utilities (for advanced usage)
export { llmClient } from './client/llm_client.ts';
export { handleSSEStream, handleSSEStreamWithRetry } from './client/stream_handler.ts';

// Export types
export type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ImageAnalysisRequest,
  TableOfContentsRequest,
  ErrorResponse,
  HealthResponse,
  ProviderInfo
} from './client/types.ts';
