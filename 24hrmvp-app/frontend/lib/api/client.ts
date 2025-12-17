// ============================================
// 24HRMVP - API CLIENT
// File: frontend/lib/api/client.ts
// Fetch-based API client with bulletproof URL handling
// ============================================

import { getApiUrl } from '../config';

// Hardcoded fallback - NEVER allow undefined URLs
const FALLBACK_API_URL = 'https://api.24hrmvp.xyz';

// Custom error class
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Get the API base URL with absolute guarantee it's never undefined
 */
function getBaseUrl(): string {
  try {
    const url = getApiUrl();
    
    // Validate the URL
    if (!url || url === 'undefined' || url === 'null' || !url.startsWith('http')) {
      console.warn('[API Client] Invalid API URL from config, using fallback:', url);
      return FALLBACK_API_URL;
    }
    
    return url;
  } catch (error) {
    console.error('[API Client] Error getting API URL, using fallback:', error);
    return FALLBACK_API_URL;
  }
}

/**
 * Build full URL for API endpoints
 */
function buildUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const fullUrl = `${cleanBase}${normalizedPath}`;
  
  // Debug log in development
  if (process.env.NODE_ENV === 'development') {
    console.debug('[API Client] Request URL:', fullUrl);
  }
  
  return fullUrl;
}

/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return sessionStorage.getItem('24hrmvp_access_token');
  } catch {
    return null;
  }
}

/**
 * Build request headers
 */
function buildHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        // Response is HTML or other non-JSON (likely 404 page)
        const text = await response.text();
        errorData = { 
          message: `Server returned ${response.status}: ${response.statusText}`,
          html: text.substring(0, 200) // First 200 chars for debugging
        };
      }
    } catch {
      errorData = { message: `HTTP error ${response.status}` };
    }
    
    throw new ApiError(
      errorData.message || errorData.error?.message || `HTTP error ${response.status}`,
      response.status,
      errorData
    );
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

/**
 * Make a GET request
 */
export async function get<T>(endpoint: string, requireAuth: boolean = false): Promise<T> {
  const url = buildUrl(endpoint);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(requireAuth),
    credentials: 'include',
  });

  return handleResponse<T>(response);
}

/**
 * Make a POST request
 */
export async function post<T>(endpoint: string, body?: object, requireAuth: boolean = true): Promise<T> {
  const url = buildUrl(endpoint);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(requireAuth),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

/**
 * Make a PUT request
 */
export async function put<T>(endpoint: string, body?: object, requireAuth: boolean = true): Promise<T> {
  const url = buildUrl(endpoint);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(requireAuth),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

/**
 * Make a PATCH request
 */
export async function patch<T>(endpoint: string, body?: object, requireAuth: boolean = true): Promise<T> {
  const url = buildUrl(endpoint);
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(requireAuth),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

/**
 * Make a DELETE request
 */
export async function del<T>(endpoint: string, requireAuth: boolean = true): Promise<T> {
  const url = buildUrl(endpoint);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(requireAuth),
    credentials: 'include',
  });

  return handleResponse<T>(response);
}

// ============================================
// API CLIENT CLASS (for hooks that need it)
// ============================================

class APIClientClass {
  async get<T>(endpoint: string, requireAuth?: boolean): Promise<T> {
    return get<T>(endpoint, requireAuth);
  }

  async post<T>(endpoint: string, body?: object, requireAuth?: boolean): Promise<T> {
    return post<T>(endpoint, body, requireAuth);
  }

  async put<T>(endpoint: string, body?: object, requireAuth?: boolean): Promise<T> {
    return put<T>(endpoint, body, requireAuth);
  }

  async patch<T>(endpoint: string, body?: object, requireAuth?: boolean): Promise<T> {
    return patch<T>(endpoint, body, requireAuth);
  }

  async delete<T>(endpoint: string, requireAuth?: boolean): Promise<T> {
    return del<T>(endpoint, requireAuth);
  }
}

// Export singleton instance
export const apiClient = new APIClientClass();

// Default export for convenience
export default apiClient;
