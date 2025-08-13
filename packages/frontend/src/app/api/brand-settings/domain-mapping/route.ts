// src/routes/brandSettings/domain-mapping.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as domainMappingCtrl from '../../controllers/brandSettings/domainMapping.controller';
import {
  domainConfigSchema,
  subdomainConfigSchema,
  sslConfigSchema,
  domainVerificationSchema,
  dnsConfigSchema
} from '../../validation/brandSettings/domainMapping.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/brand-settings/domain-mapping
 * Get current domain configuration
 */
router.get(
  '/',
  domainMappingCtrl.getDomainConfig
);

/**
 * GET /api/brand-settings/domain-mapping/status
 * Get domain setup status and health
 */
router.get(
  '/status',
  domainMappingCtrl.getDomainStatus
);

/**
 * PUT /api/brand-settings/domain-mapping/subdomain
 * Configure or update subdomain
 */
router.put(
  '/subdomain',
  strictRateLimiter(), // Prevent subdomain abuse
  validateBody(subdomainConfigSchema),
  domainMappingCtrl.updateSubdomain
);

/**
 * POST /api/brand-settings/domain-mapping/subdomain/check
 * Check subdomain availability
 */
router.post(
  '/subdomain/check',
  validateBody(subdomainConfigSchema.check),
  domainMappingCtrl.checkSubdomainAvailability
);

/**
 * PUT /api/brand-settings/domain-mapping/custom-domain
 * Add or update custom domain (premium+ feature)
 */
router.put(
  '/custom-domain',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(domainConfigSchema),
  domainMappingCtrl.updateCustomDomain
);

/**
 * POST /api/brand-settings/domain-mapping/custom-domain/verify
 * Initiate custom domain verification
 */
router.post(
  '/custom-domain/verify',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(domainVerificationSchema.initiate),
  domainMappingCtrl.initiateCustomDomainVerification
);

/**
 * POST /api/brand-settings/domain-mapping/custom-domain/verify/check
 * Check custom domain verification status
 */
router.post(
  '/custom-domain/verify/check',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(domainVerificationSchema.check),
  domainMappingCtrl.checkCustomDomainVerification
);

/**
 * DELETE /api/brand-settings/domain-mapping/custom-domain
 * Remove custom domain configuration
 */
router.delete(
  '/custom-domain',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  domainMappingCtrl.removeCustomDomain
);

/**
 * GET /api/brand-settings/domain-mapping/dns
 * Get DNS configuration instructions
 */
router.get(
  '/dns',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(dnsConfigSchema.query),
  domainMappingCtrl.getDnsInstructions
);

/**
 * POST /api/brand-settings/domain-mapping/dns/validate
 * Validate DNS configuration
 */
router.post(
  '/dns/validate',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(dnsConfigSchema.validate),
  domainMappingCtrl.validateDnsConfig
);

/**
 * GET /api/brand-settings/domain-mapping/ssl
 * Get SSL certificate status and configuration
 */
router.get(
  '/ssl',
  requireTenantPlan(['premium', 'enterprise']),
  domainMappingCtrl.getSslStatus
);

/**
 * PUT /api/brand-settings/domain-mapping/ssl
 * Update SSL configuration
 */
router.put(
  '/ssl',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(sslConfigSchema),
  domainMappingCtrl.updateSslConfig
);

/**
 * POST /api/brand-settings/domain-mapping/ssl/renew
 * Manually renew SSL certificate
 */
router.post(
  '/ssl/renew',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  domainMappingCtrl.renewSslCertificate
);

/**
 * POST /api/brand-settings/domain-mapping/ssl/force-https
 * Enable/disable force HTTPS redirect
 */
router.post(
  '/ssl/force-https',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(sslConfigSchema.forceHttps),
  domainMappingCtrl.updateForceHttps
);

/**
 * GET /api/brand-settings/domain-mapping/health
 * Domain health check and diagnostics
 */
router.get(
  '/health',
  domainMappingCtrl.performDomainHealthCheck
);

/**
 * POST /api/brand-settings/domain-mapping/test
 * Test domain configuration with comprehensive checks
 */
router.post(
  '/test',
  validateBody(domainConfigSchema.test),
  domainMappingCtrl.testDomainConfiguration
);

/**
 * GET /api/brand-settings/domain-mapping/history
 * Get domain configuration change history
 */
router.get(
  '/history',
  validateQuery(domainConfigSchema.history),
  domainMappingCtrl.getDomainHistory
);

/**
 * POST /api/brand-settings/domain-mapping/rollback
 * Rollback to previous domain configuration
 */
router.post(
  '/rollback',
  strictRateLimiter(),
  validateBody(domainConfigSchema.rollback),
  domainMappingCtrl.rollbackDomainConfig
);

export default router;