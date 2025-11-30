/**
 * LLM API service for chat functionality
 */
import { post, streamRequest } from '../client';
import { apiConfig } from '../config';
import type { ChatRequest, ChatResponse, StreamChatRequest } from './types';

export class LLMService {
  /**
   * Synchronous chat endpoint
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return post<ChatResponse>(apiConfig.endpoints.llm.chat, request);
  }

  /**
   * Streaming chat endpoint - returns async generator
   */
  async *chatStream(request: StreamChatRequest): AsyncGenerator<string, void, unknown> {
    yield* streamRequest(apiConfig.endpoints.llm.chatStream, request);
  }

  /**
   * Async chat endpoint
   */
  async chatAsync(request: ChatRequest): Promise<ChatResponse> {
    return post<ChatResponse>(apiConfig.endpoints.llm.chatAsync, request);
  }
}

// Export singleton instance
export const llmService = new LLMService();

