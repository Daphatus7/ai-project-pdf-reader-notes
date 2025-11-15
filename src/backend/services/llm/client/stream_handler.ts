/**
 * SSE stream handler for LLM responses
 */
import { StreamChunk, ErrorResponse } from './types.ts';

export async function* handleSSEStream(
  url: string,
  body: any
): AsyncGenerator<StreamChunk | ErrorResponse, void, unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Check if it's an error response
            if (data.error) {
              yield data as ErrorResponse;
              return;
            }
            
            // Check if it's a done signal
            if (data.done) {
              return;
            }
            
            // Yield the chunk
            yield data as StreamChunk;
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* handleSSEStreamWithRetry(
  url: string,
  body: any,
  maxRetries: number = 3
): AsyncGenerator<StreamChunk | ErrorResponse, void, unknown> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      yield* handleSSEStream(url, body);
      return; // Success, exit retry loop
    } catch (error) {
      retries++;
      console.warn(`SSE stream attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
}
