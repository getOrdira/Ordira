
// src/routes/certificate.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, requireTenantPlan } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { enforcePlanLimits, requireWeb3Plan } from '../middleware/planLimits.middleware';
import * as certCtrl from '../controllers/certificate.controller';
import {
  createCertificateSchema,
  batchCreateCertificatesSchema,
  certificateParamsSchema,
  listCertificatesQuerySchema
} from '../validation/certificate.validation';
import { asRouteHandler } from '../utils/routeHelpers';
import Joi from 'joi';


const transferCertificatesSchema = Joi.object({
  certificateIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one certificate ID is required',
      'array.max': 'Cannot transfer more than 50 certificates at once'
    }),
  brandWallet: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Brand wallet must be a valid Ethereum address'
    }),
  transferOptions: Joi.object({
    priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
    gasLimit: Joi.number().integer().min(21000).max(500000).optional(),
    gasPrice: Joi.number().integer().min(1).optional(),
    batchSize: Joi.number().integer().min(1).max(20).default(10)
  }).optional()
});

// Transfer single certificate schema
const transferSingleCertificateSchema = Joi.object({
  recipient: Joi.string()
    .trim()
    .custom((value, helpers) => {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      
      if (!emailRegex.test(value) && !ethAddressRegex.test(value)) {
        return helpers.error('recipient.invalidFormat');
      }
      
      return value;
    })
    .required()
    .messages({
      'recipient.invalidFormat': 'Recipient must be a valid email address or Ethereum wallet address',
      'any.required': 'Recipient is required'
    }),
  contactMethod: Joi.string()
    .valid('email', 'wallet')
    .default('email')
    .messages({
      'any.only': 'Contact method must be either "email" or "wallet"'
    })
});

// Revoke certificate schema
const revokeCertificateSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Revocation reason must be at least 10 characters',
      'string.max': 'Revocation reason cannot exceed 500 characters',
      'any.required': 'Revocation reason is required'
    }),
  notifyRecipient: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Notify recipient must be a boolean value'
    }),
  burnNft: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Burn NFT must be a boolean value'
    })
});

// Batch ID parameter schema
const batchParamsSchema = Joi.object({
  batchId: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Batch ID is required',
      'string.max': 'Batch ID cannot exceed 100 characters',
      'any.required': 'Batch ID is required'
    })
});

// Web3 analytics query schema
const web3AnalyticsQuerySchema = Joi.object({
  timeframe: Joi.string()
    .valid('7d', '30d', '90d', '180d', '1y')
    .default('30d')
    .messages({
      'any.only': 'Timeframe must be one of: 7d, 30d, 90d, 180d, 1y'
    }),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .messages({
      'any.only': 'Group by must be one of: hour, day, week, month'
    }),
  includeGasMetrics: Joi.string()
    .valid('true', 'false')
    .default('true')
    .messages({
      'any.only': 'Include gas metrics must be "true" or "false"'
    }),
  includeTransferMetrics: Joi.string()
    .valid('true', 'false')
    .default('true')
    .messages({
      'any.only': 'Include transfer metrics must be "true" or "false"'
    })
});

const router = Router();

// Apply dynamic rate limiting to all certificate routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// Apply tenant resolution for plan-based features
router.use(resolveTenant);

// ===== CERTIFICATE LISTING & RETRIEVAL =====

/**
 * GET /api/certificates
 * List certificates with enhanced Web3 filtering and pagination
 * 
 * @requires authentication: business/brand
 * @requires validation: query parameters
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/',
  validateQuery(listCertificatesQuerySchema),
  asRouteHandler(certCtrl.listCertificates)
);

/**
 * GET /api/certificates/:id
 * Get detailed certificate information with Web3 blockchain data
 * 
 * @requires authentication: business/brand
 * @requires validation: certificate ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:id',
  validateParams(certificateParamsSchema),
  asRouteHandler(certCtrl.getCertificate)
);

// ===== CERTIFICATE CREATION =====

/**
 * POST /api/certificates
 * Create single NFT certificate with automatic transfer capabilities
 * 
 * @requires authentication: business/brand
 * @requires validation: certificate creation data
 * @requires plan limits: certificate creation limits
 * @rate-limited: strict to prevent certificate spam
 */
router.post(
  '/',
  strictRateLimiter(), // Prevent certificate creation abuse
  enforcePlanLimits('certificates'), // Enforce certificate limits
  validateBody(createCertificateSchema),
  asRouteHandler(certCtrl.createCertificate)
);

/**
 * POST /api/certificates/batch
 * Create multiple certificates in batch with Web3 support
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth, Premium or Enterprise for batch operations
 * @requires validation: batch certificate data
 * @requires plan limits: certificate creation limits
 * @rate-limited: extra strict for batch operations
 */
router.post(
  '/batch',
  strictRateLimiter(), // Very strict for resource-intensive batch operations
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Batch requires Growth+ plans
  enforcePlanLimits('certificates'), // Enforce certificate limits
  validateBody(batchCreateCertificatesSchema),
  asRouteHandler(certCtrl.createBatchCertificates)
);

/**
 * GET /api/certificates/batch/:batchId/progress
 * Get batch certificate processing progress with Web3 metrics
 * 
 * @requires authentication: business/brand
 * @requires validation: batch ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/batch/:batchId/progress',
  validateParams(batchParamsSchema),
  asRouteHandler(certCtrl.getBatchProgress)
);

// ===== WEB3 TRANSFER OPERATIONS =====

/**
 * POST /api/certificates/transfer
 * Manually trigger NFT transfers to brand wallet
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth, Premium or Enterprise for Web3 features
 * @requires validation: transfer request data
 * @requires plan limits: Web3 features
 * @rate-limited: strict for security
 */
router.post(
  '/transfer',
  strictRateLimiter(), // Security for wallet transfers
  requireWeb3Plan, // Web3 features require Premium+ plans
  validateBody(transferCertificatesSchema),
  asRouteHandler(certCtrl.transferCertificates)
);

/**
 * POST /api/certificates/retry-failed
 * Retry failed NFT transfers with exponential backoff
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth, Premium or Enterprise for Web3 features
 * @requires plan limits: Web3 features
 * @rate-limited: strict to prevent retry abuse
 */
router.post(
  '/retry-failed',
  strictRateLimiter(), // Prevent retry spam
  requireWeb3Plan, // Web3 features require Premium+ plans
  asRouteHandler(certCtrl.retryFailedTransfers)
);

/**
 * GET /api/certificates/pending-transfers
 * Get certificates pending transfer to brand wallet
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth, Premium or Enterprise for Web3 features
 * @requires plan limits: Web3 features
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/pending-transfers',
  requireWeb3Plan, // Web3 features require Premium+ plans
  asRouteHandler(certCtrl.getPendingTransfers)
);

// ===== CERTIFICATE MODIFICATION =====

/**
 * PUT /api/certificates/:id/transfer
 * Transfer certificate to new recipient (change ownership)
 * 
 * @requires authentication: business/brand
 * @requires validation: certificate ID and new recipient
 * @rate-limited: strict for security
 */
router.put(
  '/:id/transfer',
  strictRateLimiter(), // Security for ownership changes
  validateParams(certificateParamsSchema),
  validateBody(transferSingleCertificateSchema),
  asRouteHandler(certCtrl.transferCertificates)
);

/**
 * POST /api/certificates/:id/revoke
 * Revoke an issued certificate with blockchain integration
 * 
 * @requires authentication: business/brand
 * @requires validation: certificate ID and revocation data
 * @rate-limited: strict for security
 */
router.post(
  '/:id/revoke',
  strictRateLimiter(), // Security for certificate revocation
  validateParams(certificateParamsSchema),
  validateBody(revokeCertificateSchema),
  asRouteHandler(certCtrl.revokeCertificate)
);

/**
 * DELETE /api/certificates/:id
 * Delete certificate (admin only - same as revoke but permanent)
 * 
 * @requires authentication: business/brand
 * @requires validation: certificate ID
 * @rate-limited: strict for security
 */
router.delete(
  '/:id',
  strictRateLimiter(), // Security for permanent deletion
  validateParams(certificateParamsSchema),
  asRouteHandler(certCtrl.revokeCertificate) // Uses same controller as revoke but with permanent flag
);

// ===== ANALYTICS & REPORTING =====

/**
 * GET /api/certificates/analytics/web3
 * Get comprehensive Web3 analytics and metrics
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth, Premium or Enterprise for Web3 features
 * @requires plan limits: Web3 features
 * @requires validation: analytics query parameters
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/analytics/web3',
  requireWeb3Plan, // Web3 analytics require Premium+ plans
  validateQuery(web3AnalyticsQuerySchema),
  asRouteHandler(certCtrl.getWeb3Analytics)
);

export default router;
