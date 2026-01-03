/**
 * Base HTTP client for API requests
 * Provides low-level fetch wrappers with error handling
 */

import { apiConfig } from './config';
import { ApiError } from './errors';

/**
 * Base fetch wrapper with error handling
 */
export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
        // If response is not JSON, use status text
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

/**
 * POST request helper
 */
export async function post<T>(endpoint: string, data: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Streaming request helper
 * Returns an async generator that yields Server-Sent Events (SSE) data
 */
export async function* streamRequest(
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

    // Handle any remaining data in buffer
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
