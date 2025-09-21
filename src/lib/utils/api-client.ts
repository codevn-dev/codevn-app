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
 * - Client-side: Uses NEXT_PUBLIC_API_URL (accessible from browser)
 * - Server-side: Uses API_URL (internal server-to-server calls)
 */
export function createApiUrl(endpoint: string): string {
  // Always use relative URLs
  // - In development: Next.js rewrites handle the proxying
  // - In production: nginx handles the proxying
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return cleanEndpoint;
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

/**
 * Enhanced fetch function with proper error handling and configuration
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise with response data
 */
export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = createApiUrl(endpoint);
  const mergedOptions: RequestInit = {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
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
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
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
export async function apiDelete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = any>(
  endpoint: string,
  data?: any,
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
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const url = createApiUrl(endpoint);
  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...options,
    method: 'POST',
    body: formData,
    // Don't set Content-Type header, let browser set it with boundary
    headers: {
      ...options.headers,
    },
  };

  // Remove Content-Type to let browser set it
  if (mergedOptions.headers) {
    delete (mergedOptions.headers as any)['Content-Type'];
  }

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}
