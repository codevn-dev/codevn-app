import {
  withRateLimit,
  withCORS,
  withRequestId,
  withSecurityHeaders,
  withMiddleware,
} from '@/config';

// Rate limiting configurations
export const RATE_LIMITS = {
  // General API rate limit
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
  },

  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 uploads per hour
  },

  // Comment creation
  COMMENTS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 comments per minute
  },

  // Article creation
  ARTICLES: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 articles per hour
  },
} as const;

// Error messages configuration
export const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  INVALID_CREDENTIALS: 'Invalid email or password',

  // Validation
  VALIDATION_ERROR: 'The provided data is invalid',
  MISSING_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please provide a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',

  // Resources
  NOT_FOUND: 'The requested resource was not found',
  ALREADY_EXISTS: 'This resource already exists',
  CONFLICT: 'There is a conflict with the current state',

  // File upload
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'File type is not supported',
  UPLOAD_FAILED: 'Failed to upload file',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',

  // Server
  INTERNAL_ERROR: 'An internal server error occurred',
  DATABASE_ERROR: 'A database error occurred',
  EXTERNAL_SERVICE_ERROR: 'An external service is currently unavailable',
} as const;

// API response templates
export const API_RESPONSES = {
  SUCCESS: (data: any, message?: string) => ({
    success: true,
    data,
    message,
  }),

  ERROR: (message: string, code?: string, details?: any) => ({
    success: false,
    error: message,
    code,
    details,
  }),

  VALIDATION_ERROR: (errors: Record<string, string[]>) => ({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors,
  }),
} as const;

// Default middleware stack
export const DEFAULT_MIDDLEWARE = [withRequestId, withSecurityHeaders, withCORS];

// Rate limited middleware for different endpoints
export const createRateLimitedHandler = (
  handler: any,
  rateLimitType: keyof typeof RATE_LIMITS = 'GENERAL'
) => {
  return withMiddleware(handler, [
    ...DEFAULT_MIDDLEWARE,
    withRateLimit(RATE_LIMITS[rateLimitType]),
  ]);
};

// Environment-specific configurations
export const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    isDevelopment,
    isProduction,
    logLevel: isDevelopment ? 'debug' : 'info',
    enableDetailedErrors: isDevelopment,
    enableRateLimiting: isProduction,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  };
};
