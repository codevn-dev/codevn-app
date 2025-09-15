import { NextResponse } from 'next/server';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // File Upload
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  statusCode: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Predefined errors
export const Errors = {
  // Authentication & Authorization
  UNAUTHORIZED: (message: string = 'Unauthorized') =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),

  FORBIDDEN: (message: string = 'Forbidden') => new AppError(ErrorCode.FORBIDDEN, message, 403),

  INVALID_CREDENTIALS: (message: string = 'Invalid credentials') =>
    new AppError(ErrorCode.INVALID_CREDENTIALS, message, 401),

  // Validation
  VALIDATION_ERROR: (message: string, details?: any) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),

  MISSING_REQUIRED_FIELD: (field: string) =>
    new AppError(ErrorCode.MISSING_REQUIRED_FIELD, `Missing required field: ${field}`, 400),

  INVALID_INPUT: (message: string, details?: any) =>
    new AppError(ErrorCode.INVALID_INPUT, message, 400, details),

  // Resource
  NOT_FOUND: (resource: string = 'Resource') =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  ALREADY_EXISTS: (resource: string = 'Resource') =>
    new AppError(ErrorCode.ALREADY_EXISTS, `${resource} already exists`, 409),

  CONFLICT: (message: string) => new AppError(ErrorCode.CONFLICT, message, 409),

  // Server
  INTERNAL_ERROR: (message: string = 'Internal server error') =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500),

  DATABASE_ERROR: (message: string = 'Database error') =>
    new AppError(ErrorCode.DATABASE_ERROR, message, 500),

  // File Upload
  FILE_TOO_LARGE: (maxSize: string) =>
    new AppError(ErrorCode.FILE_TOO_LARGE, `File too large. Maximum size is ${maxSize}`, 413),

  INVALID_FILE_TYPE: (allowedTypes: string[]) =>
    new AppError(
      ErrorCode.INVALID_FILE_TYPE,
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      400
    ),

  UPLOAD_FAILED: (message: string = 'File upload failed') =>
    new AppError(ErrorCode.UPLOAD_FAILED, message, 500),

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: (message: string = 'Rate limit exceeded') =>
    new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429),
};

export function handleApiError(error: unknown): NextResponse {
  // If it's our custom AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // If it's a known error type
  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: ErrorCode.VALIDATION_ERROR,
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (error.name === 'PrismaClientKnownRequestError') {
      return NextResponse.json(
        {
          error: 'Database error',
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR,
    },
    { status: 500 }
  );
}

export function createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode });
}
