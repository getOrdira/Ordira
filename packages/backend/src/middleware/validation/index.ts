/**
 * Request Validation & Security Middleware Module
 * 
 * Exports Joi-based validation schemas, security validation, and OWASP-compliant middleware
 */

// Joi validation schemas and middleware
export {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  validateConditional,
  asValidatedHandler,
  createCustomSchema,
  customJoi,
  commonSchemas,
  businessSchemas,
  manufacturerSchemas,
  brandSchemas,
  analyticsSchemas,
  billingSchemas,
  querySchemas,
  type ValidatedRequest,
  type RequiredValidatedRequest,
  type ValidationOptions
} from './validation.middleware';

// Security validation middleware
export {
  SecurityValidationMiddleware,
  securityValidationMiddleware,
  validateJSON,
  securityHeaders,
  apiRateLimit,
  progressiveSlowDown,
  type SecurityValidationOptions,
  type SecurityEvent
} from './security-validation.middleware';

