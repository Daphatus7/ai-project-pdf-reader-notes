/**
 * API Services - Centralized API calls for the frontend
 * All API interactions should go through this file
 */

// Types
export type ContentType = 'explanation' | 'summary' | 'answer' | 'analysis' | 'code' | 'table' | 'list';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  data: string; // Base64-encoded image (no data URI prefix)
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  name?: string;
}

export type InputContent = TextContent | ImageContent;

export interface ChatRequest {
  contents: InputContent[];
  system_message?: string;
}

export interface ChatResponse {
  response: string;
  usage?: Record<string, unknown> | null;
}

export interface StreamChatRequest {
  contents: InputContent[];
  system_message?: string;
  expected_content_type?: ContentType;
}

export interface CodeBlock {
  language: string;
  code: string;
  explanation?: string;
}

export interface MathExpression {
  latex: string;
  description?: string;
  is_block?: boolean;
}

export interface Section {
  heading: string;
  content: string;
}

export interface LLMStructuredOutput {
  content: string;
  content_type: ContentType;
  title?: string;
  sections?: Section[];
  key_points?: string[];
  code_blocks?: CodeBlock[];
  math_expressions?: MathExpression[];
  references?: string[];
  suggested_followups?: string[];
}

export interface StructuredChatRequest {
  contents: InputContent[];
  system_message?: string;
  expected_content_type?: ContentType;
}

export interface StructuredChatResponse {
  structured_output: LLMStructuredOutput;
  usage?: Record<string, unknown> | null;
}

export interface StructuredImageChatRequest {
  contents: InputContent[];
  system_message?: string;
  expected_content_type?: ContentType;
}

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

// Error handling
export class ApiError extends Error {
  statusCode?: number;
  response?: unknown;
  
  constructor(
    message: string,
    statusCode?: number,
    response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 30000,
  endpoints: {
    llm: {
      chat: '/api/llm/chat',
      chatStream: '/api/llm/chat/stream',
      chatAsync: '/api/llm/chat/async',
      chatStructured: '/api/llm/chat/structured',
      chatStructuredSync: '/api/llm/chat/structured/sync',
      chatStructuredStream: '/api/llm/chat/structured/stream',
    },
  },
} as const;

// Base HTTP client
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData: unknown = null;

      try {
        errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
          errorMessage = String(errorData.detail);
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('Network error: Could not connect to backend', 0);
    }

    throw new ApiError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function post<T>(endpoint: string, data: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function* streamRequest(
  endpoint: string,
  data: unknown
): AsyncGenerator<string, void, unknown> {
  const url = `${apiConfig.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        errorMessage = String(errorData.detail);
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, response.status);
  }

  if (!response.body) {
    throw new ApiError('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const text = line.slice(6);
          
          if (text.startsWith('[ERROR]')) {
            throw new ApiError(text.slice(8));
          }

          yield text;
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      const text = buffer.slice(6);
      if (!text.startsWith('[ERROR]')) {
        yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * LLM API service for chat functionality.
 * 
 * Provides methods for:
 * - Regular chat (sync and async)
 * - Streaming chat
 * - Structured output chat (enforces schema-conformant responses)
 */
export const llmApi = {
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
	 * Structured output chat endpoint.
	 * 
	 * Returns responses conforming to the LLMStructuredOutput schema,
	 * making it easier to parse and display markdown, LaTeX, and GFM content.
	 * 
	 * @param request - The structured chat request
	 * @returns Structured response with content, type, sections, key points, etc.
	 */
	async chatStructured(request: StructuredChatRequest): Promise<StructuredChatResponse> {
		return post<StructuredChatResponse>(apiConfig.endpoints.llm.chatStructured, request);
	},

	/**
	 * Synchronous structured output chat endpoint.
	 * Useful for debugging and simpler use cases.
	 * 
	 * @param request - The structured chat request
	 * @returns Structured response with content, type, sections, key points, etc.
	 */
	async chatStructuredSync(request: StructuredChatRequest): Promise<StructuredChatResponse> {
		return post<StructuredChatResponse>(apiConfig.endpoints.llm.chatStructuredSync, request);
	},

	/**
	 * Streaming structured output chat endpoint.
	 * 
	 * Streams both text chunks and structured output updates.
	 * Yields objects with type 'text', 'structured', 'done', or 'error'.
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
				yield {type: 'text', content: chunk};
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
