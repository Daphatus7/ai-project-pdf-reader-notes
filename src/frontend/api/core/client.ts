/**
 * Base HTTP client for API requests
 * Provides low-level fetch wrappers with error handling
 */

import { apiConfig } from './config';
import { ApiError } from './errors';
import { supabase } from '../services/supabase';

/**
 * Base fetch wrapper with error handling
 */
export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${apiConfig.baseUrl}${endpoint}`;

  const{ data: { session } } = await supabase.auth.getSession();
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json', 
	  ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
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
 * GET request helper
 */
export async function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, {
    method: 'GET',
  });
}

/**
 * PUT request helper
 */
export async function put<T>(endpoint: string, data: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function del<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'DELETE',
    ...(data && { body: JSON.stringify(data) }),
  });
}
