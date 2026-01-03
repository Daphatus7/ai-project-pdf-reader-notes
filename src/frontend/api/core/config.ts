/**
 * API configuration for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30 seconds
  endpoints: {
    llm: {
      chat: '/api/v1/llm/chat',
      chatStream: '/api/v1/llm/chat/stream',
      chatAsync: '/api/v1/llm/chat/async',
      chatStructured: '/api/v1/llm/chat/structured',
      chatStructuredSync: '/api/v1/llm/chat/structured/sync',
      chatStructuredStream: '/api/v1/llm/chat/structured/stream',
    },
  },
} as const;
