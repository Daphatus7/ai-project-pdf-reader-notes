/**
 * LLM API client for backend communication
 */
import {
  ChatRequest,
  ChatResponse,
  ImageAnalysisRequest,
  TableOfContentsRequest,
  HealthResponse,
  ProviderInfo,
  StreamChunk,
  ErrorResponse
} from './types.ts';
import { handleSSEStreamWithRetry } from './stream_handler.ts';
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api.ts';

export class LLMClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!this.baseUrl) {
      return normalizedEndpoint;
    }

    return `${this.baseUrl}${normalizedEndpoint}`;
  }

  /**
   * Send a chat message with streaming response
   */
  async *sendMessageStream(
    message: string,
    images?: string[],
    context?: string,
    provider?: 'openai' | 'claude' | 'gemini'
  ): AsyncGenerator<StreamChunk | ErrorResponse, void, unknown> {
    const request: ChatRequest = {
      message,
      images,
      context,
      provider,
      stream: true
    };

    yield* handleSSEStreamWithRetry(
      this.buildUrl(API_ENDPOINTS.CHAT_STREAM),
      request
    );
  }

  /**
   * Send a chat message with non-streaming response
   */
  async sendMessage(
    message: string,
    images?: string[],
    context?: string,
    provider?: 'openai' | 'claude' | 'gemini'
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      images,
      context,
      provider,
      stream: false
    };

    const response = await fetch(this.buildUrl(API_ENDPOINTS.CHAT), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Analyze an image
   */
  async analyzeImage(
    imageUrl: string,
    prompt?: string,
    context?: string
  ): Promise<ChatResponse> {
    const request: ImageAnalysisRequest = {
      image_url: imageUrl,
      prompt,
      context
    };

    const response = await fetch(this.buildUrl(API_ENDPOINTS.ANALYZE_IMAGE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate table of contents from PDF content
   */
  async generateTableOfContents(
    pdfContent: string,
    context?: string
  ): Promise<ChatResponse> {
    const request: TableOfContentsRequest = {
      pdf_content: pdfContent,
      context
    };

    const response = await fetch(this.buildUrl(API_ENDPOINTS.GENERATE_TOC), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check health status
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(this.buildUrl(API_ENDPOINTS.HEALTH));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available providers
   */
  async getProviders(): Promise<{ providers: ProviderInfo[] }> {
    const response = await fetch(this.buildUrl(API_ENDPOINTS.PROVIDERS));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Default client instance
export const llmClient = new LLMClient();
