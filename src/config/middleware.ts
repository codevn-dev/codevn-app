import { NextRequest, NextResponse } from 'next/server';

// Rate limiting interface (now in-memory only)
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest) => string;
}

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Simple in-memory rate limiting (replaces Redis-based rate limiting)
export function withRateLimit(config: RateLimitConfig) {
  return (handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const key = config.keyGenerator ? config.keyGenerator(request) : getClientIP(request);
      const now = Date.now();

      // Clean up expired entries
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }

      const entry = rateLimitStore.get(key);

      if (!entry || entry.resetTime < now) {
        // First request in window or window expired
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
      } else {
        // Increment counter
        entry.count++;

        if (entry.count > config.maxRequests) {
          // Rate limit exceeded
          return NextResponse.json(
            { error: 'Too many requests' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': entry.resetTime.toString(),
              },
            }
          );
        }
      }

      return handler(request);
    };
  };
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

// CORS middleware
export function withCORS(handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request);

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  };
}

// Request ID middleware
export function withRequestId(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    // Add request ID to headers for logging
    request.headers.set('x-request-id', requestId);

    const response = await handler(request);

    // Add request ID to response headers
    response.headers.set('x-request-id', requestId);

    return response;
  };
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Security headers middleware
export function withSecurityHeaders(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  };
}

// Combine multiple middlewares
export function withMiddleware(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  middlewares: Array<(h: any) => any> = []
) {
  return middlewares.reduce((acc, middleware) => middleware(acc), handler);
}
