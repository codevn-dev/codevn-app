/**
 * Environment configuration
 * Centralized environment variables management for Next.js
 */

// Database configuration
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  name: process.env.DB_NAME || 'codevn',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
} as const;

// Auth configuration (includes JWT settings)
export const authConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-characters-long',
  url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  trustHost: true,
  maxAge: 30 * 24 * 60 * 60, // 30 days
} as const;

// File upload configuration
export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  uploadPath: process.env.UPLOAD_PATH || 'public/uploads',
  avatarPath: process.env.AVATAR_PATH || 'public/uploads/avatars',
  imagePath: process.env.IMAGE_PATH || 'public/uploads/images',
} as const;

// API configuration
export const apiConfig = {
  // Server-side API URL (internal calls)
  serverUrl: process.env.API_URL || 'http://localhost:3001',
  // Client-side API URL (public, accessible from browser)
  clientUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.API_TIMEOUT || '10000'), // 10 seconds
  retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
} as const;

// Chat configuration
export const chatConfig = {
  maxMessagesPerPage: parseInt(process.env.CHAT_MAX_MESSAGES_PER_PAGE || '20'),
  typingTimeout: parseInt(process.env.CHAT_TYPING_TIMEOUT || '2000'), // 2 seconds
  maxReconnectAttempts: parseInt(process.env.CHAT_MAX_RECONNECT_ATTEMPTS || '5'),
  wsUrl: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/api/chat/ws`,
} as const;

// Comment configuration
export const commentConfig = {
  wsUrl: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/api/comments/ws`,
} as const;

// Pagination configuration
export const paginationConfig = {
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10'),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100'),
} as const;

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
} as const;

// CORS configuration
export const corsConfig = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
} as const;

// Logging configuration
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE === 'true',
  filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
} as const;

// Development configuration
export const devConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  enableDebug: process.env.ENABLE_DEBUG === 'true',
} as const;

// Email configuration (if needed)
export const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@codevn.com',
} as const;

// Redis configuration (if needed)
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0'),
} as const;

// Validation function to check required environment variables
export function validateEnv() {
  const requiredVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Export all configs as a single object for convenience
export const config = {
  db: dbConfig,
  auth: authConfig,
  upload: uploadConfig,
  api: apiConfig,
  chat: chatConfig,
  comment: commentConfig,
  pagination: paginationConfig,
  rateLimit: rateLimitConfig,
  cors: corsConfig,
  logging: loggingConfig,
  dev: devConfig,
  email: emailConfig,
  redis: redisConfig,
} as const;

export default config;
