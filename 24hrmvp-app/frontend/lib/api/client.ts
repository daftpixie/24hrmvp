/**
 * API Client with Authentication
 * 
 * @version 6.0.0
 * 
 * Provides fetch wrapper with automatic:
 * - Authentication header injection
 * - Error handling
 * - Response parsing
 */

import { getApiUrl } from '@/lib/config';
import { getAccessToken, getAuthHeaders, clearTokens } from '@/lib/auth/token-store';

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeout?: number;
}

// ============================================
// ERROR CLASS
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// API CLIENT
// ============================================

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth = false, timeout = 30000, ...fetchOptions } = options;

  const baseUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add auth header if not skipped and token exists
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 - clear tokens
    if (response.status === 401) {
      clearTokens();
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Parse response
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        response.status,
        data.error?.code,
        data.error?.details
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }
      throw new ApiError(error.message, 0, 'NETWORK_ERROR');
    }

    throw new ApiError('Unknown error', 0, 'UNKNOWN');
  }
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

// ============================================
// EXPORTS
// ============================================

export const api = {
  request: apiRequest,
  get,
  post,
  put,
  delete: del,
};

export default api;
