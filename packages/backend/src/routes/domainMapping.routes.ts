
// src/routes/domainMapping.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, requireTenantPlan } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as domainCtrl from '../controllers/domainMapping.controller';
import {
  addDomainSchema,
  domainParamsSchema,
  listDomainsQuerySchema,
  domainVerificationSchema,
  updateDomainConfigSchema
} from '../validation/domainMapping.validation';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';

import Joi from 'joi';

// Domain ID parameter schema
const domainIdParamsSchema = Joi.object({
  domainId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Domain ID must be a valid MongoDB ObjectId',
      'any.required': 'Domain ID is required'
    })
});

// Domain verification request schema
const verifyDomainSchema = Joi.object({
  verificationMethod: Joi.string()
    .valid('dns', 'file', 'email')
    .default('dns')
    .messages({
      'any.only': 'Verification method must be one of: dns, file, email'
    })
});

// Domain analytics query schema
const domainAnalyticsQuerySchema = Joi.object({
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d')
    .default('7d')
    .messages({
      'any.only': 'Timeframe must be one of: 24h, 7d, 30d, 90d'
    }),
  includePerformance: Joi.string()
    .valid('true', 'false')
    .default('true')
    .messages({
      'any.only': 'Include performance must be "true" or "false"'
    }),
  includeErrors: Joi.string()
    .valid('true', 'false')
    .default('true')
    .messages({
      'any.only': 'Include errors must be "true" or "false"'
    }),
  includeTraffic: Joi.string()
    .valid('true', 'false')
    .default('true')
    .messages({
      'any.only': 'Include traffic must be "true" or "false"'
    })
});

// Performance metrics query schema (simplified for performance endpoint)
const performanceQuerySchema = Joi.object({
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d')
    .default('7d')
    .messages({
      'any.only': 'Timeframe must be one of: 24h, 7d, 30d, 90d'
    })
});
const renewCertificateSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Renewal reason cannot exceed 200 characters'
    }),
  certificateType: Joi.string()
    .valid('letsencrypt', 'custom')
    .optional()
    .messages({
      'any.only': 'Certificate type must be either "letsencrypt" or "custom"'
    })
});

const router = Router();

// Apply dynamic rate limiting to all domain mapping routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply authentication to all routes
router.use(authenticate);

// Apply tenant resolution for plan-based features
router.use(resolveTenant);

// ===== DOMAIN LISTING & RETRIEVAL =====

/**
 * GET /api/domain-mappings
 * List all domain mappings with enhanced status and health information
 * 
 * @requires authentication: business/brand
 * @requires validation: query parameters for filtering and pagination
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/',
  validateQuery(listDomainsQuerySchema),
  domainCtrl.listDomainMappings
);

/**
 * GET /api/domain-mappings/:domainId
 * Get detailed information about a specific domain mapping
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:domainId',
  validateParams(domainIdParamsSchema),
  domainCtrl.getDomainMapping
);

// ===== DOMAIN CREATION & MANAGEMENT =====

/**
 * POST /api/domain-mappings
 * Add new custom domain mapping with advanced SSL and verification
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth or higher for custom domains
 * @requires validation: domain configuration data
 * @rate-limited: strict to prevent domain abuse
 */
router.post(
  '/',
  asRateLimitHandler(strictRateLimiter()), // Prevent domain mapping abuse
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Custom domains require Growth+
  validateBody(addDomainSchema),
  domainCtrl.addDomainMapping
);

/**
 * PUT /api/domain-mappings/:domainId
 * Update domain mapping configuration and settings
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID and update configuration
 * @rate-limited: strict for security
 */
router.put(
  '/:domainId',
  asRateLimitHandler(strictRateLimiter()), // Security for configuration changes
  validateParams(domainIdParamsSchema),
  validateBody(updateDomainConfigSchema),
  domainCtrl.updateDomainMapping
);

/**
 * DELETE /api/domain-mappings/:domainId
 * Remove domain mapping with resource cleanup
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID parameter
 * @rate-limited: strict for security
 */
router.delete(
  '/:domainId',
  asRateLimitHandler(strictRateLimiter()), // Security for domain removal
  validateParams(domainIdParamsSchema),
  domainCtrl.removeDomainMapping
);

// ===== DOMAIN VERIFICATION =====

/**
 * POST /api/domain-mappings/:domainId/verify
 * Verify domain ownership and activate mapping
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID and verification method
 * @rate-limited: strict to prevent verification spam
 */
router.post(
  '/:domainId/verify',
  asRateLimitHandler(strictRateLimiter()), // Prevent verification abuse
  validateParams(domainIdParamsSchema),
  validateBody(verifyDomainSchema),
  domainCtrl.verifyDomain
);

/**
 * GET /api/domain-mappings/:domainId/status
 * Get domain verification and operational status
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:domainId/status',
  validateParams(domainIdParamsSchema),
  domainCtrl.getDomainHealth
);

// ===== SSL CERTIFICATE MANAGEMENT =====

/**
 * POST /api/domain-mappings/:domainId/renew-certificate
 * Manually renew SSL certificate for domain
 * 
 * @requires authentication: business/brand
 * @requires plan: Premium or higher for manual certificate management
 * @requires validation: domain ID and renewal options
 * @rate-limited: strict to prevent certificate abuse
 */
router.post(
  '/:domainId/renew-certificate',
  asRateLimitHandler(strictRateLimiter()), // Prevent certificate renewal abuse
  requireTenantPlan(['premium', 'enterprise']), // Advanced SSL features require Premium+
  validateParams(domainIdParamsSchema),
  validateBody(renewCertificateSchema),
  domainCtrl.renewCertificate
);

/**
 * GET /api/domain-mappings/:domainId/certificate
 * Get SSL certificate information and status
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:domainId/certificate',
  validateParams(domainIdParamsSchema),
  (req, res, next) => {
    // Redirect to domain details with certificate focus
    req.query = { ...req.query, focus: 'certificate' };
    domainCtrl.getDomainMapping(req, res, next);
  }
);

// ===== HEALTH MONITORING & TESTING =====

/**
 * GET /api/domain-mappings/:domainId/health
 * Get real-time domain health status and metrics
 * 
 * @requires authentication: business/brand
 * @requires plan: Premium or higher for advanced health monitoring
 * @requires validation: domain ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:domainId/health',
  requireTenantPlan(['premium', 'enterprise']), // Advanced monitoring requires Premium+
  validateParams(domainIdParamsSchema),
  domainCtrl.getDomainHealth
);

/**
 * POST /api/domain-mappings/:domainId/test
 * Run comprehensive domain configuration tests
 * 
 * @requires authentication: business/brand
 * @requires validation: domain ID parameter
 * @rate-limited: strict to prevent test abuse
 */
router.post(
  '/:domainId/test',
  asRateLimitHandler(strictRateLimiter()), // Prevent test spam
  validateParams(domainIdParamsSchema),
  domainCtrl.testDomain
);

/**
 * POST /api/domain-mappings/:domainId/health-check
 * Trigger manual health check for domain
 * 
 * @requires authentication: business/brand
 * @requires plan: Premium or higher for manual health checks
 * @requires validation: domain ID parameter
 * @rate-limited: strict to prevent check abuse
 */
router.post(
  '/:domainId/health-check',
  asRateLimitHandler(strictRateLimiter()), // Prevent health check abuse
  requireTenantPlan(['premium', 'enterprise']), // Manual health checks require Premium+
  validateParams(domainIdParamsSchema),
  domainCtrl.getDomainHealth
);

// ===== ANALYTICS & PERFORMANCE =====

/**
 * GET /api/domain-mappings/:domainId/analytics
 * Get comprehensive domain performance analytics
 * 
 * @requires authentication: business/brand
 * @requires plan: Enterprise for advanced analytics
 * @requires validation: domain ID and analytics query parameters
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:domainId/analytics',
  requireTenantPlan(['enterprise']), // Advanced analytics require Enterprise
  validateParams(domainIdParamsSchema),
  validateQuery(domainAnalyticsQuerySchema),
  domainCtrl.getDomainAnalytics
);

/**
 * GET /api/domain-mappings/:domainId/performance
 * Get domain performance metrics and insights
 * 
 * @requires authentication: business/brand
 * @requires plan: Premium or higher for performance metrics
 * @requires validation: domain ID parameter
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/:domainId/performance',
  requireTenantPlan(['premium', 'enterprise']), // Performance metrics require Premium+
  validateParams(domainIdParamsSchema),
  validateQuery(performanceQuerySchema),
  (req, res, next) => {
    // Use analytics controller with performance focus
    req.query = { ...req.query, includePerformance: 'true', includeTraffic: 'false', includeErrors: 'false' };
    domainCtrl.getDomainAnalytics(req, res, next);
  }
);

// ===== LEGACY COMPATIBILITY ROUTES =====

/**
 * GET /api/domains (legacy route)
 * Legacy compatibility for old domain listing endpoint
 * 
 * @deprecated Use /api/domain-mappings instead
 * @requires authentication: business/brand
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/legacy/domains',
  validateQuery(listDomainsQuerySchema),
  (req, res, next) => {
    // Add deprecation warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /api/domain-mappings instead.');
    domainCtrl.listDomainMappings(req, res, next);
  }
);

/**
 * GET /api/domains/:domain/status (legacy route)
 * Legacy compatibility for domain status checking
 * 
 * @deprecated Use /api/domain-mappings/:domainId/status instead
 * @requires authentication: business/brand
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/legacy/domains/:domain/status',
  validateParams(domainParamsSchema),
  (req, res, next) => {
    // Add deprecation warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /api/domain-mappings/:domainId/status instead.');
    // Note: This would need domain-to-ID resolution in the controller
    domainCtrl.getDomainHealth(req, res, next);
  }
);

export default router;
