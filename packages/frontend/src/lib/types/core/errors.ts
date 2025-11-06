/**
 * Error Types
 * 
 * Re-exports backend error types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Re-export error interfaces from backend
export type {
  AppError
} from '@backend/controllers/utils/error.helpers';

export type {
  ErrorCodes
} from '@backend/services/infrastructure/http/core/response.service';

// Re-export domain-specific error classes (for type checking)
// Note: These are classes in backend, but we only need the types/interfaces for frontend
export type {
  ProductError
} from '@backend/services/products/utils/errors';

export type {
  MediaError
} from '@backend/services/media/utils/errors';

export type {
  AnalyticsError,
  AnalyticsValidationError
} from '@backend/services/analytics/utils/errors';

export type {
  SubscriptionError
} from '@backend/services/subscriptions/utils/errors';

export type {
  EcommerceIntegrationError
} from '@backend/services/integrations/ecommerce/core/errors';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Frontend error response with additional client-side metadata
 */
export interface FrontendErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    _clientError?: boolean;
    _retryable?: boolean;
    _statusCode?: number;
  };
  data?: null;
}

/**
 * Network error type for frontend-specific network issues
 */
export interface NetworkError {
  message: string;
  code: 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'CORS_ERROR';
  statusCode?: number;
  retryable: boolean;
}

/**
 * Validation error for frontend form validation
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

