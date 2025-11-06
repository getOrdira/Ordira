/**
 * Common Types
 * 
 * Re-exports common backend types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  StandardErrorResponse,
  StandardSuccessResponse,
  ErrorCodes
} from '@backend/services/infrastructure/http/core/response.service';

import type {
  ApiResponse as ControllerApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  ResponseMeta,
  PaginationMeta
} from '@backend/controllers/utils/response.helpers';

// Re-export all backend types
export type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  StandardErrorResponse,
  StandardSuccessResponse,
  ErrorCodes,
  ControllerApiResponse,
  PaginatedResponse,
  ApiErrorResponse,
  ResponseMeta,
  PaginationMeta
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Frontend API response wrapper with enhanced metadata
 */
export interface FrontendApiResponse<T = any> extends ControllerApiResponse<T> {
  _clientTimestamp?: string;
  _requestId?: string;
  _cacheKey?: string;
}

/**
 * Frontend paginated response with enhanced metadata
 */
export interface FrontendPaginatedResponse<T = any> extends PaginatedResponse<T> {
  _clientTimestamp?: string;
  _requestId?: string;
  _cacheKey?: string;
}

