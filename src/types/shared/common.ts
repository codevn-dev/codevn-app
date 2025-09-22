export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Simple success-only response shape
export interface SuccessResponse {
  success: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface SearchParams {
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
