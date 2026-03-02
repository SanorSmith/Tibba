/**
 * Standard API Response Types
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AuditLog {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: any;
  timestamp: string;
}

export function successResponse<T>(data: T, pagination?: ApiResponse['pagination']): ApiResponse<T> {
  return {
    data,
    ...(pagination && { pagination }),
  };
}

export function errorResponse(error: string): ApiResponse {
  return {
    error,
  };
}

export function paginationInfo(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}
