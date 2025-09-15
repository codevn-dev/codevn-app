import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, Errors } from '../utils/errors';
import { logger } from '../utils/logger';

type ApiHandler = (request: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

type ApiHandlerWithContext = (
  request: NextRequest,
  context: any
) => Promise<NextResponse> | NextResponse;

export function withErrorHandling(handler: ApiHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const requestContext = logger.extractRequestContext(request);

    try {
      const response = await handler(request, context);
      return response;
    } catch (error) {
      logger.error(
        `API Error: ${request.method} ${request.url}`,
        requestContext,
        error instanceof Error ? error : new Error(String(error))
      );

      return handleApiError(error);
    }
  };
}

export function withErrorHandlingAndContext(handler: ApiHandlerWithContext) {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    const requestContext = logger.extractRequestContext(request, context.userId);

    try {
      const response = await handler(request, context);
      return response;
    } catch (error) {
      logger.error(
        `API Error: ${request.method} ${request.url}`,
        requestContext,
        error instanceof Error ? error : new Error(String(error))
      );

      return handleApiError(error);
    }
  };
}

// Helper function to validate required fields
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missingFields.length > 0) {
    throw Errors.MISSING_REQUIRED_FIELD(missingFields.join(', '));
  }
}

// Helper function to validate request body
export async function validateRequestBody<T>(
  request: NextRequest,
  schema?: (data: any) => T
): Promise<T> {
  try {
    const body = await request.json();

    if (schema) {
      return schema(body);
    }

    return body;
  } catch {
    throw Errors.INVALID_INPUT('Invalid JSON in request body');
  }
}

// Helper function to check authentication
export function requireAuth(
  session: any
): asserts session is { user: { id: string; role?: string } } {
  if (!session?.user?.id) {
    throw Errors.UNAUTHORIZED();
  }
}

// Helper function to check admin role
export function requireAdmin(
  session: any
): asserts session is { user: { id: string; role: 'admin' } } {
  requireAuth(session);

  if (session.user.role !== 'admin') {
    throw Errors.FORBIDDEN('Admin privileges required');
  }
}

// Helper function to check resource ownership
export function requireOwnership(session: any, resourceUserId: string): void {
  requireAuth(session);

  if (session.user.id !== resourceUserId && session.user.role !== 'admin') {
    throw Errors.FORBIDDEN('You can only access your own resources');
  }
}

// Helper function for pagination
export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Helper function for sorting
export function getSortParams(request: NextRequest, allowedFields: string[]) {
  const { searchParams } = new URL(request.url);

  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  if (!allowedFields.includes(sortBy)) {
    throw Errors.INVALID_INPUT(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
  }

  return { sortBy, sortOrder };
}

// Helper function for search
export function getSearchParam(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get('search') || '';
}
