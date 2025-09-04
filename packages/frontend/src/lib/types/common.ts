// src/lib/types/common.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';

/**
 * Standard API response wrapper for all successful and error responses
 * Aligned with backend response patterns
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: string[] | Record<string, string>;
  code?: string;
}

/**
 * Error response structure matching backend error handling
 */
export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  field?: string;
  timestamp?: string;
  details?: string | Record<string, any>;
}

/**
 * Enhanced pagination response structure 
 * Matches backend pagination patterns with additional metadata
 */
export interface PaginatedResponse<T> {
  docs: T[]; // Main data array
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
  // Additional metadata
  hasMore?: boolean;
  offset?: number;
}

/**
 * Alternative pagination structure for simpler responses
 * Used by some backend endpoints
 */
export interface SimplePaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Bulk operation response structure
 * Used for operations that affect multiple items
 */
export interface BulkOperationResponse {
  success: boolean;
  message: string;
  processed: number;
  successful: number;
  failed: number;
  errors?: Array<{
    index?: number;
    id?: string;
    error: string;
    code?: string;
  }>;
  results?: any[];
}

/**
 * Select option interface for form controls and dropdowns
 */
export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
  icon?: string;
  group?: string;
}

/**
 * Common filter and sort options for list endpoints
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

/**
 * Upload response structure for file uploads
 */
export interface UploadResponse {
  success: boolean;
  message?: string;
  file?: {
    id: string;
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    url: string;
    publicUrl?: string;
  };
  files?: Array<{
    id: string;
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    url: string;
    publicUrl?: string;
  }>;
}

/**
 * Validation error structure matching backend validation
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

/**
 * Rate limit information structure
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Audit log entry structure for tracking changes
 */
export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userType: 'customer' | 'manufacturer' | 'brand';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Export options for data export functionality
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  fields?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
  includeMetadata?: boolean;
}

/**
 * Export response structure
 */
export interface ExportResponse {
  success: boolean;
  message?: string;
  exportId?: string;
  downloadUrl?: string;
  filename?: string;
  format: string;
  recordCount?: number;
  expiresAt?: string;
}

/**
 * Health check response structure
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: Record<string, {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    message?: string;
  }>;
  uptime: number;
}

/**
 * Analytics summary structure
 */
export interface AnalyticsSummary {
  period: string;
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate?: number;
  growth?: {
    users: number;
    sessions: number;
    engagement: number;
  };
}

/**
 * Notification structure
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security' | 'product_selection';
  read: boolean;
  actionUrl?: string;
  data?: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Generic ID parameter interface
 */
export interface IdParam {
  id: string;
}

/**
 * Generic status update interface
 */
export interface StatusUpdate {
  status: string;
  reason?: string;
  effectiveDate?: string;
  metadata?: Record<string, any>;
}

/**
 * Common entity metadata structure
 */
export interface EntityMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  archived?: boolean;
  archivedAt?: string;
}

/**
 * Search result structure with highlighting
 */
export interface SearchResult<T> {
  items: T[];
  total: number;
  took: number; // Search time in ms
  maxScore?: number;
  highlights?: Record<string, string[]>;
  facets?: Record<string, Array<{
    value: string;
    count: number;
  }>>;
}

/**
 * Generic key-value pair interface
 */
export interface KeyValuePair<T = any> {
  key: string;
  value: T;
  label?: string;
  description?: string;
}

/**
 * Time range interface for analytics and filtering
 */
export interface TimeRange {
  start: string;
  end: string;
  timezone?: string;
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
}

/**
 * Generic configuration interface
 */
export interface Configuration {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  sensitive?: boolean;
  category?: string;
}

/**
 * Error boundary error interface
 */
export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

// ===== JOI VALIDATION SCHEMAS =====
// Validation schemas for common interfaces

/**
 * Query parameters validation schema
 * For pagination and filtering
 */
export const queryParamsSchema = Joi.object<QueryParams>({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  sort: Joi.string()
    .valid('createdAt', 'updatedAt', 'name', 'email', 'status', 'title')
    .optional(),
  sortOrder: commonSchemas.sortOrder,
  search: commonSchemas.searchQuery,
  filters: Joi.object().optional()
});

/**
 * Select option validation schema
 * For form dropdowns and select components
 */
export const selectOptionSchema = Joi.object<SelectOption>({
  label: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Label cannot be empty',
      'string.max': 'Label cannot exceed 200 characters',
      'any.required': 'Label is required'
    }),
  value: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      'any.required': 'Value is required'
    }),
  disabled: Joi.boolean().default(false),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  icon: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Icon name cannot exceed 100 characters'
    }),
  group: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Group name cannot exceed 100 characters'
    })
});

/**
 * Export options validation schema
 * For data export functionality
 */
export const exportOptionsSchema = Joi.object<ExportOptions>({
  format: Joi.string()
    .valid('json', 'csv', 'xlsx', 'pdf')
    .required()
    .messages({
      'any.only': 'Format must be json, csv, xlsx, or pdf',
      'any.required': 'Export format is required'
    }),
  fields: Joi.array()
    .items(Joi.string().trim().max(100))
    .min(1)
    .max(50)
    .optional()
    .messages({
      'array.min': 'At least one field must be selected',
      'array.max': 'Cannot select more than 50 fields'
    }),
  filters: Joi.object().optional(),
  dateRange: Joi.object({
    start: commonSchemas.date.required(),
    end: Joi.date()
      .iso()
      .min(Joi.ref('start'))
      .required()
      .messages({
        'date.min': 'End date must be after start date'
      })
  }).optional(),
  includeMetadata: Joi.boolean().default(false)
});

/**
 * Time range validation schema
 * For analytics and date filtering
 */
export const timeRangeSchema = Joi.object<TimeRange>({
  start: commonSchemas.date.required(),
  end: Joi.date()
    .iso()
    .min(Joi.ref('start'))
    .required()
    .messages({
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required'
    }),
  timezone: Joi.string()
    .max(50)
    .default('UTC')
    .optional()
    .messages({
      'string.max': 'Timezone cannot exceed 50 characters'
    }),
  preset: Joi.string()
    .valid('today', 'yesterday', 'last7days', 'last30days', 'last90days', 'custom')
    .optional()
    .messages({
      'any.only': 'Preset must be today, yesterday, last7days, last30days, last90days, or custom'
    })
});

/**
 * Notification validation schema
 * For creating and updating notifications
 */
export const notificationSchema = Joi.object<Notification>({
  id: commonSchemas.mongoId.required(),
  type: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      'string.max': 'Notification type cannot exceed 50 characters',
      'any.required': 'Notification type is required'
    }),
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
  message: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required'
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be low, medium, high, or urgent'
    }),
  category: Joi.string()
    .valid('system', 'billing', 'certificate', 'vote', 'invite', 'order', 'security', 'product_selection')
    .required()
    .messages({
      'any.only': 'Category must be system, billing, certificate, vote, invite, order, security, or product_selection',
      'any.required': 'Category is required'
    }),
  read: Joi.boolean().default(false),
  actionUrl: commonSchemas.optionalUrl,
  data: Joi.object().optional(),
  createdAt: commonSchemas.date.required(),
  expiresAt: Joi.date()
    .iso()
    .min(Joi.ref('createdAt'))
    .optional()
    .messages({
      'date.min': 'Expiration date must be after creation date'
    })
});

/**
 * Status update validation schema
 * For generic status changes
 */
export const statusUpdateSchema = Joi.object<StatusUpdate>({
  status: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Status cannot be empty',
      'string.max': 'Status cannot exceed 50 characters',
      'any.required': 'Status is required'
    }),
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    }),
  effectiveDate: commonSchemas.date.optional(),
  metadata: Joi.object().optional()
});

/**
 * Key-value pair validation schema
 * For configuration and metadata
 */
export const keyValuePairSchema = Joi.object<KeyValuePair>({
  key: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
    .required()
    .messages({
      'string.min': 'Key cannot be empty',
      'string.max': 'Key cannot exceed 100 characters',
      'string.pattern.base': 'Key must start with a letter and contain only letters, numbers, hyphens, and underscores',
      'any.required': 'Key is required'
    }),
  value: Joi.any().required().messages({
    'any.required': 'Value is required'
  }),
  label: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Label cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    })
});

/**
 * Configuration validation schema
 * For system configuration settings
 */
export const configurationSchema = Joi.object<Configuration>({
  key: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z][a-zA-Z0-9._-]*$/)
    .required()
    .messages({
      'string.min': 'Configuration key cannot be empty',
      'string.max': 'Configuration key cannot exceed 100 characters',
      'string.pattern.base': 'Key must start with a letter and contain only letters, numbers, dots, hyphens, and underscores',
      'any.required': 'Configuration key is required'
    }),
  value: Joi.any().required().messages({
    'any.required': 'Configuration value is required'
  }),
  type: Joi.string()
    .valid('string', 'number', 'boolean', 'object', 'array')
    .required()
    .messages({
      'any.only': 'Type must be string, number, boolean, object, or array',
      'any.required': 'Configuration type is required'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  required: Joi.boolean().default(false),
  sensitive: Joi.boolean().default(false),
  category: Joi.string()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    })
});

/**
 * ID parameter validation schema
 * For route parameters
 */
export const idParamSchema = Joi.object<IdParam>({
  id: commonSchemas.mongoId.required()
});

/**
 * Bulk operation response validation schema
 * For validating bulk operation results
 */
export const bulkOperationResponseSchema = Joi.object<BulkOperationResponse>({
  success: Joi.boolean().required(),
  message: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is required'
    }),
  processed: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.integer': 'Processed count must be an integer',
      'number.min': 'Processed count cannot be negative',
      'any.required': 'Processed count is required'
    }),
  successful: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('processed'))
    .required()
    .messages({
      'number.max': 'Successful count cannot exceed processed count'
    }),
  failed: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('processed'))
    .required()
    .messages({
      'number.max': 'Failed count cannot exceed processed count'
    }),
  errors: Joi.array()
    .items(Joi.object({
      index: Joi.number().integer().min(0).optional(),
      id: Joi.string().optional(),
      error: Joi.string().required(),
      code: Joi.string().optional()
    }))
    .optional(),
  results: Joi.array().optional()
});

/**
 * Search parameters validation schema
 * For search functionality
 */
export const searchParamsSchema = Joi.object({
  query: commonSchemas.searchQuery.required(),
  filters: Joi.object().optional(),
  sortBy: Joi.string()
    .valid('relevance', 'date', 'name', 'popularity')
    .default('relevance')
    .optional(),
  sortOrder: commonSchemas.sortOrder,
  page: commonSchemas.page,
  limit: commonSchemas.limit.max(50).default(20), // Lower limit for search
  includeHighlights: Joi.boolean().default(true),
  includeFacets: Joi.boolean().default(false)
});

/**
 * Export all common validation schemas for easy importing
 */
export const commonValidationSchemas = {
  queryParams: queryParamsSchema,
  selectOption: selectOptionSchema,
  exportOptions: exportOptionsSchema,
  timeRange: timeRangeSchema,
  notification: notificationSchema,
  statusUpdate: statusUpdateSchema,
  keyValuePair: keyValuePairSchema,
  configuration: configurationSchema,
  idParam: idParamSchema,
  bulkOperationResponse: bulkOperationResponseSchema,
  searchParams: searchParamsSchema
};