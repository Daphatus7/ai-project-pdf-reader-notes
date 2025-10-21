/**
 * Client-side types for LLM API communication
 */

export interface ChatRequest {
  message: string;
  images?: string[];
  context?: string;
  provider?: 'openai' | 'claude' | 'gemini';
  stream?: boolean;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  metadata?: {
    provider: string;
    model: string;
  };
}

export interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata?: {
    finish_reason?: string;
    response_time?: number;
    cost?: number;
  };
}

export interface ImageAnalysisRequest {
  image_url: string;
  prompt?: string;
  context?: string;
}

export interface TableOfContentsRequest {
  pdf_content: string;
  context?: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  code?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  providers?: Record<string, boolean>;
}

export interface ProviderInfo {
  name: string;
  enabled: boolean;
  healthy: boolean;
  capabilities?: Record<string, any>;
}
