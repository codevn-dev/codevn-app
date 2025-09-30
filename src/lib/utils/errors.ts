import { NextResponse } from 'next/server';
import { CommonError, AuthError, SessionError, CategoryError, AdminError } from '@/types/shared';

type SharedError =
  | (typeof CommonError)[keyof typeof CommonError]
  | (typeof AuthError)[keyof typeof AuthError]
  | (typeof SessionError)[keyof typeof SessionError]
  | (typeof CategoryError)[keyof typeof CategoryError]
  | (typeof AdminError)[keyof typeof AdminError];

function mapErrorToStatus(error: string): number {
  switch (error) {
    // Common
    case CommonError.BAD_REQUEST:
    case CommonError.INVALID_PARAM:
      return 400;
    case CommonError.NOT_FOUND:
      return 404;
    case CommonError.ACCESS_DENIED:
      return 403;
    case CommonError.CONFLICT:
      return 409;
    case CommonError.INTERNAL_ERROR:
      return 500;

    // Auth
    case AuthError.INVALID_CREDENTIALS:
    case AuthError.INVALID_REFRESH_TOKEN:
      return 401;
    case AuthError.EMAIL_EXISTS:
      return 400;
    case AuthError.TOKENS_REQUIRED:
      return 400;

    // Session
    case SessionError.TOKENS_REQUIRED:
      return 400;

    // Category
    case CategoryError.DELETE_CONFLICT:
      return 409;

    // Admin
    case AdminError.MISSING_FIELDS:
    case AdminError.INVALID_ROLE:
      return 400;
    case AdminError.USER_NOT_FOUND:
      return 404;

    default:
      return 500;
  }
}

export function handleApiError(error: unknown): NextResponse {
  // If it's a thrown Error with our standardized message
  if (error instanceof Error) {
    const errStr = String(error.message) as SharedError | string;
    const status = mapErrorToStatus(errStr);
    return NextResponse.json({ success: false, error: errStr }, { status });
  }

  // Unknown error
  return NextResponse.json({ success: false, error: CommonError.INTERNAL_ERROR }, { status: 500 });
}

export function createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status: statusCode });
}
