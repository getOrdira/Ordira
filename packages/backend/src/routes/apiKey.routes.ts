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
 * Validation schemas for API key management
 */
const createApiKeySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'API key name must be at least 3 characters',
      'string.max': 'API key name cannot exceed 50 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  
  permissions: Joi.array()
    .items(Joi.string().valid(
      'read', 'write', 'delete',
      'products:read', 'products:write', 'products:delete',
      'analytics:read', 'certificates:read', 'certificates:write',
      'votes:read', 'votes:write', 'nfts:read', 'nfts:write'
    ))
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
  
  expiresIn: Joi.string()
    .valid('30d', '90d', '1y', 'never')
    .default('1y')
    .optional()
    .messages({
      'any.only': 'Expiration must be 30d, 90d, 1y, or never'
    }),
  
  ipWhitelist: Joi.array()
    .items(Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' }))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 IP addresses allowed in whitelist',
      'string.ip': 'Invalid IP address format'
    }),
  
  rateLimitTier: Joi.string()
    .valid('standard', 'high', 'unlimited')
    .default('standard')
    .optional()
});

const updateApiKeySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .optional(),
  
  description: Joi.string()
    .trim()
    .max(200)
    .optional(),
  
  permissions: Joi.array()
    .items(Joi.string().valid(
      'read', 'write', 'delete',
      'products:read', 'products:write', 'products:delete',
      'analytics:read', 'certificates:read', 'certificates:write',
      'votes:read', 'votes:write', 'nfts:read', 'nfts:write'
    ))
    .min(1)
    .max(10)
    .unique()
    .optional(),
  
  ipWhitelist: Joi.array()
    .items(Joi.string().ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' }))
    .max(10)
    .optional(),
  
  isActive: Joi.boolean().optional(),
  
  rateLimitTier: Joi.string()
    .valid('standard', 'high', 'unlimited')
    .optional()
}).min(1).messages({
  'object.min': 'At least one field must be updated'
});

const apiKeyListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  status: Joi.string().valid('active', 'inactive', 'expired', 'all').default('all').optional(),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string().valid('name', 'createdAt', 'lastUsedAt', 'expiresAt').default('createdAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional()
});

const apiKeyParamsSchema = Joi.object({
  keyId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid API key ID format',
    'string.length': 'API key ID must be 24 characters'
  })
});

/**
 * Create a new API key
 * POST /api/api-keys
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires validation: API key creation data
 */
router.post(
  '/',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 10 creations per minute
  validateBody(createApiKeySchema),
  apiKeyCtrl.createKey
);

/**
 * List all API keys for the authenticated business
 * GET /api/api-keys
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @optional query: pagination, filtering, sorting
 */
router.get(
  '/',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 60 requests per minute
  validateQuery(apiKeyListQuerySchema),
  apiKeyCtrl.listKeys
);

/**
 * Get API key details by ID
 * GET /api/api-keys/:keyId
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires params: { keyId: string }
 */
router.get(
  '/:keyId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 100 requests per minute
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.getKeyDetails
);

/**
 * Update API key configuration
 * PUT /api/api-keys/:keyId
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires params: { keyId: string }
 * @requires validation: API key update data
 */
router.put(
  '/:keyId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 20 updates per minute
  validateParams(apiKeyParamsSchema),
  validateBody(updateApiKeySchema),
  apiKeyCtrl.updateKey
);

/**
 * Revoke/delete an API key
 * DELETE /api/api-keys/:keyId
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires params: { keyId: string }
 */
router.delete(
  '/:keyId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 20 revocations per minute
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.revokeKey
);

/**
 * Rotate API key (generate new key, keep same config)
 * POST /api/api-keys/:keyId/rotate
 * 
 * @requires authentication & tenant context
 * @requires enterprise plan
 * @requires params: { keyId: string }
 */
router.post(
  '/:keyId/rotate',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // 5 rotations per minute
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.rotateKey
);

/**
 * Get API key usage statistics
 * GET /api/api-keys/:keyId/usage
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires params: { keyId: string }
 * @optional query: date range for usage stats
 */
router.get(
  '/:keyId/usage',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(),
  validateParams(apiKeyParamsSchema),
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    granularity: Joi.string().valid('hour', 'day', 'week').default('day').optional()
  })),
  apiKeyCtrl.getKeyUsage
);

/**
 * Test API key functionality
 * POST /api/api-keys/:keyId/test
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires params: { keyId: string }
 */
router.post(
  '/:keyId/test',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 20 tests per minute
  validateParams(apiKeyParamsSchema),
  apiKeyCtrl.testKey
);

/**
 * Bulk operations on API keys
 * POST /api/api-keys/bulk
 * 
 * @requires authentication & tenant context
 * @requires enterprise plan
 * @requires validation: bulk operation data
 */
router.post(
  '/bulk',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // 5 bulk operations per minute
  validateBody(Joi.object({
    action: Joi.string().valid('revoke', 'activate', 'deactivate').required(),
    keyIds: Joi.array()
      .items(Joi.string().hex().length(24))
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
 * GET /api/api-keys/audit
 * 
 * @requires authentication & tenant context
 * @requires enterprise plan
 * @optional query: filtering and pagination
 */
router.get(
  '/audit',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
 dynamicRateLimiter(), // 30 requests per minute
  validateQuery(Joi.object({
    keyId: Joi.string().hex().length(24).optional(),
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
 * POST /api/api-keys/export
 * 
 * @requires authentication & tenant context
 * @requires enterprise plan
 * @requires validation: export configuration
 */
router.post(
  '/export',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // 3 exports per minute
  validateBody(Joi.object({
    format: Joi.string().valid('json', 'csv').default('json').optional(),
    includeUsageStats: Joi.boolean().default(false).optional(),
    includeAuditLog: Joi.boolean().default(false).optional(),
    keyIds: Joi.array()
      .items(Joi.string().hex().length(24))
      .max(100)
      .optional()
  })),
  apiKeyCtrl.exportKeys
);

export default router;