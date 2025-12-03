/**
 * API configuration for backend communication
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30 seconds
  endpoints: {
    llm: {
      chat: '/api/llm/chat',
      chatStream: '/api/llm/chat/stream',
      chatAsync: '/api/llm/chat/async',
    },
  },
} as const;


