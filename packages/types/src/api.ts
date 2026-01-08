/**
 * API 响应结构
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * 分页响应结构
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

