/**
 * LLM API service for chat functionality
 *
 * Provides methods for:
 * - Regular chat (sync and async)
 * - Streaming chat
 * - Structured output chat (enforces schema-conformant responses)
 */

import { post, streamRequest } from '../core/client';
import { apiConfig } from '../core/config';
import type { InputContent } from '../types/common';
import type {
  ChatRequest,
  ChatResponse,
  StreamChatRequest,
  StructuredChatRequest,
  StructuredChatResponse,
  StructuredImageChatRequest,
} from '../types/llm';

/**
 * Converts data URLs to InputContent array
 */
export function convertDataUrlsToContents(messageText: string, imageUrls: string[]): InputContent[] {
  const contents: InputContent[] = [
    { type: 'text', text: messageText }
  ];

  for (const imageUrl of imageUrls) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1] as 'image/png' | 'image/jpeg' | 'image/webp';
      const base64Data = match[2];
      contents.push({
        type: 'image',
        data: base64Data,
        mime_type: mimeType === 'image/jpeg' ? 'image/jpeg' : mimeType === 'image/webp' ? 'image/webp' : 'image/png'
      });
    }
  }

  return contents;
}

/**
 * LLM service object with all LLM-related API methods
 */
export const llmService = {
  /**
   * Synchronous chat endpoint
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return post<ChatResponse>(apiConfig.endpoints.llm.chat, request);
  },

  /**
   * Streaming chat endpoint - returns async generator
   */
  async *chatStream(request: StreamChatRequest): AsyncGenerator<string, void, unknown> {
    yield* streamRequest(apiConfig.endpoints.llm.chatStream, request);
  },

  /**
   * Async chat endpoint
   */
  async chatAsync(request: ChatRequest): Promise<ChatResponse> {
    return post<ChatResponse>(apiConfig.endpoints.llm.chatAsync, request);
  },

  /**
   * Structured output chat endpoint
   *
   * Returns responses conforming to the LLMStructuredOutput schema,
   * making it easier to parse and display markdown, LaTeX, and GFM content
   *
   * @param request - The structured chat request
   * @returns Structured response with content, type, sections, key points, etc.
   */
  async chatStructured(request: StructuredChatRequest): Promise<StructuredChatResponse> {
    return post<StructuredChatResponse>(apiConfig.endpoints.llm.chatStructured, request);
  },

  /**
   * Synchronous structured output chat endpoint
   * Useful for debugging and simpler use cases
   *
   * @param request - The structured chat request
   * @returns Structured response with content, type, sections, key points, etc.
   */
  async chatStructuredSync(request: StructuredChatRequest): Promise<StructuredChatResponse> {
    return post<StructuredChatResponse>(apiConfig.endpoints.llm.chatStructuredSync, request);
  },

  /**
   * Streaming structured output chat endpoint
   *
   * Streams both text chunks and structured output updates
   * Yields objects with type 'text', 'structured', 'done', or 'error'
   *
   * @param request - The structured chat request
   * @returns Async generator yielding stream events
   */
  async *chatStructuredStream(request: StructuredChatRequest):
    AsyncGenerator<{ type: string; content?: string; data?: unknown; message?: string }, void, unknown> {
    for await (const chunk of streamRequest(apiConfig.endpoints.llm.chatStructuredStream, request)) {
      try {
        const parsed = JSON.parse(chunk);
        yield parsed;
      } catch {
        // If parsing fails, treat as plain text (backward compatibility)
        yield { type: 'text', content: chunk };
      }
    }
  },

  /**
   * Streaming structured output chat with image support
   */
  async *chatStructuredStreamImage(request: StructuredImageChatRequest):
    AsyncGenerator<{ type: string; content?: string; data?: unknown; message?: string }, void, unknown> {
    // Convert to StructuredChatRequest format for backend compatibility
    const structuredRequest: StructuredChatRequest = {
      contents: request.contents,
      system_message: request.system_message,
      expected_content_type: request.expected_content_type
    };
    for await (const chunk of streamRequest(apiConfig.endpoints.llm.chatStructuredStream, structuredRequest)) {
      try {
        const parsed = JSON.parse(chunk);
        yield parsed;
      } catch {
        // If parsing fails, treat as plain text (backward compatibility)
        yield { type: 'text', content: chunk };
      }
    }
  },

  /**
   * Simplified method to send text message with images
   * Converts data URLs to InputContent format automatically
   */
  async *sendMessageWithImages(
    messageText: string,
    imageUrls: string[],
    systemMessage?: string
  ): AsyncGenerator<{ type: string; content?: string; data?: unknown; message?: string }, void, unknown> {
    const contents = convertDataUrlsToContents(messageText, imageUrls);
    const request: StructuredImageChatRequest = {
      contents,
      system_message: systemMessage
    };
    yield* this.chatStructuredStreamImage(request);
  },

  /**
   * Simplified method to send text message only
   */
  async *sendMessage(
    messageText: string,
    systemMessage?: string
  ): AsyncGenerator<{ type: string; content?: string; data?: unknown; message?: string }, void, unknown> {
    const request: StructuredChatRequest = {
      contents: [{ type: 'text', text: messageText }],
      system_message: systemMessage
    };
    yield* this.chatStructuredStream(request);
  },
};
