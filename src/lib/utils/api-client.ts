/**
 * API Client utilities for consistent API calls
 * Handles both client-side and server-side API calls with proper URL resolution
 */

import { apiConfig } from '@/config';
import ky, { HTTPError, KyInstance } from 'ky';

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

let kyClient: KyInstance | null = null;

function getKy(): KyInstance {
  if (kyClient) return kyClient;

  kyClient = ky.create({
    prefixUrl: '',
    credentials: 'include',
    timeout: apiConfig.timeout,
    retry: {
      limit: apiConfig.retryAttempts,
      methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
    },
    hooks: {
      beforeRequest: [
        (request) => {
          // If there is no body, avoid forcing JSON content-type
          const method = request.method?.toUpperCase();
          const hasBody = !['GET', 'HEAD'].includes(method || '') && request.body != null;
          if (!hasBody) {
            request.headers.delete('Content-Type');
          }
        },
      ],
      afterResponse: [
        async (_request, _options, response) => {
          if (!response.ok) {
            let errorData: unknown = {};
            try {
              errorData = await response.clone().json();
            } catch {}
            const message = extractMessage(
              errorData,
              `HTTP ${response.status}: ${response.statusText}`
            );
            const error = new Error(message) as Error & {
              response?: { error: string; data: unknown };
            };
            error.response = { error: message, data: errorData };
            throw error;
          }
          return response;
        },
      ],
    },
  });

  return kyClient;
}

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
  try {
    const response = await getKy().extend({
      headers: {
        ...(defaultFetchOptions.headers as Record<string, string>),
        ...(options.headers as Record<string, string>),
      },
      credentials: defaultFetchOptions.credentials as RequestCredentials,
    })(url, {
      method: options.method,
      body: options.body as BodyInit | null | undefined,
      // ky handles throwing on non-2xx via afterResponse hook above
    });
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof HTTPError) {
      const res = error.response;
      let errorData: unknown = {};
      try {
        errorData = await res.clone().json();
      } catch {}
      const message = extractMessage(errorData, `HTTP ${res.status}: ${res.statusText}`);
      const err = new Error(message) as Error & { response?: { error: string; data: unknown } };
      err.response = { error: message, data: errorData };
      throw err;
    }
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
  try {
    const response = await getKy().post(url, {
      body: formData,
      headers: {
        ...(options.headers as Record<string, string>),
        // Explicitly let browser set multipart boundary
      },
      credentials: 'include',
    });
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof HTTPError) {
      const res = error.response;
      let errorData: any = {};
      try {
        errorData = await res.clone().json();
      } catch {}
      throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    if (error instanceof Error) throw error;
    throw new Error('Network error occurred');
  }
}
