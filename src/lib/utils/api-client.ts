/**
 * API Client utilities for consistent API calls
 * Handles both client-side and server-side API calls with proper URL resolution
 */

import { apiConfig } from '@/config';

/**
 * Get the appropriate API URL based on the environment
 * - Client-side: Uses NEXT_PUBLIC_API_URL (accessible from browser)
 * - Server-side: Uses API_URL (internal server-to-server calls)
 */
export function getApiUrl(): string {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    return apiConfig.clientUrl;
  }

  // Server-side
  return apiConfig.serverUrl;
}

/**
 * Create API URL that automatically handles client/server context
 * - Client-side: Uses relative URLs (Next.js rewrites handle the proxying)
 * - Server-side: Uses absolute URLs (direct calls to Fastify server)
 */
export function createApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    // Client-side: use relative URLs
    return cleanEndpoint;
  }

  // Server-side: use absolute URLs to call Fastify server directly
  return `${apiConfig.serverUrl}${cleanEndpoint}`;
}

/**
 * Default fetch options for API calls
 */
export const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const obj = data as { error?: unknown; message?: unknown };
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}

/**
 * Enhanced fetch function with proper error handling and configuration
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise with response data
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = createApiUrl(endpoint);

  // Prepare headers
  const headers = new Headers();

  // Add default headers
  if (defaultFetchOptions.headers) {
    Object.entries(defaultFetchOptions.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Add custom headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Remove Content-Type for requests without body
  const method = options.method?.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method || '') && options.body != null;
  if (!hasBody) {
    headers.delete('Content-Type');
  }

  try {
    const response = await fetch(url, {
      ...defaultFetchOptions,
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: unknown = {};
      try {
        errorData = await response.clone().json();
      } catch {}
      const message = extractMessage(errorData, `HTTP ${response.status}: ${response.statusText}`);
      const error = new Error(message) as Error & { response?: { error: string; data: unknown } };
      error.response = { error: message, data: errorData };
      throw error;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Network error occurred');
  }
}

/**
 * GET request helper
 */
const inFlightGetRequests: Map<string, Promise<unknown>> = new Map();

export async function apiGet<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use the normalized URL string as the cache key
  const urlKey = createApiUrl(endpoint);

  // If an identical GET is already in flight, return the same promise
  const existing = inFlightGetRequests.get(urlKey);
  if (existing) return existing as Promise<T>;

  const promise = apiFetch<T>(endpoint, { ...options, method: 'GET' }).finally(() => {
    inFlightGetRequests.delete(urlKey);
  });

  inFlightGetRequests.set(urlKey, promise);
  return promise;
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  data?: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Upload file helper
 */
export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const url = createApiUrl(endpoint);

  // Prepare headers for multipart upload
  const headers = new Headers();

  // Add custom headers (don't set Content-Type for FormData - let browser set it)
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.clone().json();
      } catch {}
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Network error occurred');
  }
}
