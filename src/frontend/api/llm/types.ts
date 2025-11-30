/**
 * TypeScript types matching backend Pydantic models
 */

export interface ChatRequest {
  message: string;
  system_message?: string;
}

export interface ChatResponse {
  response: string;
  usage?: Record<string, unknown> | null;
}

export interface StreamChatRequest {
  message: string;
  system_message?: string;
}

