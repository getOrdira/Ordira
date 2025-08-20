// src/routes/apiKey.routes.ts

import { Router } from 'express';
import { resolveTenant } from '../middleware/tenant.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import { requireTenantPlan } from '../middleware/tenant.middleware';
import * as apiKeyCtrl from '../controllers/apiKey.controller';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas aligned with actual controller and service
 */
const createApiKeySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .default('Default API Key')
    .optional()
    .messages({
      'string.min': 'API key name must be at least 3 characters',
      'string.max': 'API key name cannot exceed 50 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(500) // Matches model maxlength
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  permissions: Joi.array()
    .items(Joi.string().valid(
      'read', 'write', 'admin', 'analytics', 'integrations', 'webhooks', 'export'
    )) // Matches model enum
    .min(1)
    .max(10)
    .unique()
    .default(['read'])
    .optional()
    .messages({
      'array.min': 'At least one permission is required',
      'array.max': 'Maximum 10 permissions allowed',
      'array.unique': 'Duplicate permissions are not allowed'
    }),
  
  expiresAt: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .messages({
      'date.greater': 'Expiration date must be in the future'
    }),
  
  rateLimits: Joi.object({
    requestsPerMinute: Joi.number()
      .integer()
      .min(1)
      .max(10000) // Matches model constraints
      .optional(),
    requestsPerDay: Joi.number()
      .integer()
      .min(1)
      .max(1000000) // Matches model constraints
      .optional()
  }).optional(),
  
  allowedOrigins: Joi.array()
    .items(Joi.string().uri().allow('*'))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 allowed origins',
      'string.uri': 'Invalid origin URL format'
    })
});

const updateApiKeySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .optional(),
  
  description: Joi.string()
    .trim()
    .max(500)
    .optional(),
  
  permissions: Joi.array()
    .items(Joi.string().valid(
      'read', 'write', 'admin', 'analytics', 'integrations', 'webhooks', 'export'
    ))
    .min(1)
    .max(10)
    .unique()
    .optional(),
  
  expiresAt: Joi.date()
    .iso()
    .allow(null) // Allow clearing expiration
    .optional(),
  
  rateLimits: Joi.object({
    requestsPerMinute: Joi.number()
      .integer()
      .min(1)
      .max(10000)
      .optional(),
    requestsPerDay: Joi.number()
      .integer()
      .min(1)
      .max(1000000)
      .optional()
  }).optional(),
  
  allowedOrigins: Joi.array()
    .items(Joi.string().uri().allow('*'))
    .max(10)
    .optional(),
  
  isActive: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be updated'
});

const apiKeyParamsSchema = Joi.object({
  keyId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'API key ID is required'
    })
});

const usageQuerySchema = Joi.object({
  timeframe: Joi.string()
    .valid('7d', '30d', '90d', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week')
    .default('day')
    .optional()
});

/**
 * CORE API KEY MANAGEMENT - ALIGNED WITH ACTUAL CONTROLLER METHODS
 */

/**
 * Create a new API key
 * POST /api/brand/api-keys
 * Maps to: apiKeyCtrl.createKey
 */
router.post(
  '/',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Lowered from premium+ to growth+
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(createApiKeySchema),
  apiKeyCtrl.createKey
);

/**
 * List all API keys for the authenticated business
 * GET /api/brand/api-keys
 * Maps to: apiKeyCtrl.listKeys
 */
router.get(
  '/',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  apiKeyCtrl.listKeys
);

/**
 * Update API key configuration
 * PUT /api/brand/api-keys/:keyId
 * Maps to: apiKeyCtrl.updateKey
 */
router.put(
  '/:keyId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(apiKeyParamsSchema),
  validateBody(updateApiKeySchema),
  apiKeyCtrl.updateKey
);

/**
 * Revoke/delete an API key
 * DELETE /api/brand/api-keys/:keyId
 * Maps to: apiKeyCtrl.revokeKey
 */
router.delete(
  '/:keyId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.revokeKey
);

/**
 * Get API key usage statistics
 * GET /api/brand/api-keys/:keyId/usage
 * Maps to: apiKeyCtrl.getKeyUsage
 */
router.get(
  '/:keyId/usage',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']), // Higher plan for detailed usage stats
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(apiKeyParamsSchema),
  validateQuery(usageQuerySchema),
  apiKeyCtrl.getKeyUsage
);

/**
 * Rotate API key (generate new key, keep same config)
 * POST /api/brand/api-keys/:keyId/rotate
 * Maps to: apiKeyCtrl.rotateKey
 */
router.post(
  '/:keyId/rotate',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']), // Premium+ for key rotation
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.rotateKey
);

/**
 * ADDITIONAL API KEY MANAGEMENT FEATURES
 */

/**
 * Get API key details by ID
 * GET /api/brand/api-keys/:keyId
 * Maps to: apiKeyCtrl.getKeyDetails
 */
router.get(
  '/:keyId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.getKeyDetails
);

/**
 * Test API key functionality
 * POST /api/brand/api-keys/:keyId/test
 * Maps to: apiKeyCtrl.testKey
 */
router.post(
  '/:keyId/test',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.testKey
);

/**
 * Bulk operations on API keys
 * POST /api/brand/api-keys/bulk
 * Maps to: apiKeyCtrl.bulkUpdateKeys
 */
router.post(
  '/bulk',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(Joi.object({
    action: Joi.string().valid('revoke', 'activate', 'deactivate').required(),
    keyIds: Joi.array()
      .items(Joi.string().trim())
      .min(1)
      .max(50)
      .unique()
      .required()
      .messages({
        'array.min': 'At least one API key ID is required',
        'array.max': 'Maximum 50 API keys can be processed at once',
        'array.unique': 'Duplicate API key IDs are not allowed'
      }),
    reason: Joi.string().trim().max(200).optional()
  })),
  apiKeyCtrl.bulkUpdateKeys
);

/**
 * Get API key security audit log
 * GET /api/brand/api-keys/audit
 * Maps to: apiKeyCtrl.getAuditLog
 */
router.get(
  '/audit',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateQuery(Joi.object({
    keyId: Joi.string().trim().optional(),
    action: Joi.string().valid('created', 'updated', 'revoked', 'rotated', 'used').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional()
  })),
  apiKeyCtrl.getAuditLog
);

/**
 * Export API key data and configurations
 * POST /api/brand/api-keys/export
 * Maps to: apiKeyCtrl.exportKeys
 */
router.post(
  '/export',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // Fixed: No parameters
  validateBody(Joi.object({
    format: Joi.string().valid('json', 'csv').default('json').optional(),
    includeUsageStats: Joi.boolean().default(false).optional(),
    includeAuditLog: Joi.boolean().default(false).optional(),
    keyIds: Joi.array()
      .items(Joi.string().trim())
      .max(100)
      .optional()
  })),
  apiKeyCtrl.exportKeys
);

export default router;