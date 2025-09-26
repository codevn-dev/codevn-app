export const AuthError = {
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  TOKENS_REQUIRED: 'TOKENS_REQUIRED',
} as const;

export type AuthErrorCode = (typeof AuthError)[keyof typeof AuthError];

export interface ApiErrorBody {
  error: string;
  code?: string;
}

export const CommonError = {
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_PARAM: 'INVALID_PARAM',
  NOT_FOUND: 'NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const SessionError = {
  TOKENS_REQUIRED: 'TOKENS_REQUIRED',
} as const;

export const CategoryError = {
  DELETE_CONFLICT: 'CATEGORY_DELETE_CONFLICT',
} as const;

export const AdminError = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_ROLE: 'INVALID_ROLE',
  MISSING_FIELDS: 'MISSING_FIELDS',
} as const;
