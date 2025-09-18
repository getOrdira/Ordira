
// src/routes/emailGating.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, requireTenantPlan } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as emailGatingCtrl from '../controllers/emailGating.controller';
import {
  emailGatingSettingsSchema,
  customersImportSchema,
  csvImportSchema,
  customerListQuerySchema,
  customerAccessParamsSchema,
  bulkAccessSchema,
  emailCheckParamsSchema
} from '../validation/emailGating.validation';

// Additional validation schemas for missing controller endpoints
import Joi from 'joi';

// Customer access action schema (for revoke/restore body)
const customerAccessActionSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

// Customer ID parameter schema (standalone)
const customerIdParamsSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Customer ID must be a valid MongoDB ObjectId',
      'any.required': 'Customer ID is required'
    })
});

const router = Router();

// Apply dynamic rate limiting to all email gating routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply authentication to all routes (requires brand/business authentication)
router.use(authenticate);

// Apply tenant resolution for plan-based features
router.use(resolveTenant);

// ===== EMAIL GATING SETTINGS =====

/**
 * GET /api/email-gating/settings
 * Get email gating configuration and analytics overview
 * 
 * @requires authentication: business/brand
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/settings',
  asRouteHandler(emailGatingCtrl.getEmailGatingSettings)
);

/**
 * PUT /api/email-gating/settings
 * Update email gating configuration
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth or higher for email gating features
 * @requires validation: email gating settings data
 * @rate-limited: dynamic based on plan
 */
router.put(
  '/settings',
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Email gating is a premium feature
  validateBody(emailGatingSettingsSchema),
  asRouteHandler(emailGatingCtrl.updateEmailGatingSettings)
);

// ===== CUSTOMER MANAGEMENT =====

/**
 * GET /api/email-gating/customers
 * List allowed customers with advanced filtering and analytics
 * 
 * @requires authentication: business/brand
 * @requires validation: query parameters for filtering and pagination
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/customers',
  validateQuery(customerListQuerySchema),
  asRouteHandler(emailGatingCtrl.getCustomers)
);

/**
 * POST /api/email-gating/customers
 * Add customers manually or via API import
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth or higher for customer management
 * @requires validation: customer import data
 * @rate-limited: strict to prevent import abuse
 */
router.post(
  '/customers',
  asRateLimitHandler(strictRateLimiter()), // Prevent abuse of customer imports
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Customer management requires Growth+
  validateBody(customersImportSchema),
  asRouteHandler(emailGatingCtrl.addCustomers)
);

/**
 * DELETE /api/email-gating/customers/:customerId
 * Delete customer from allowed list permanently
 * 
 * @requires authentication: business/brand
 * @requires validation: customer ID parameter
 * @rate-limited: strict for security
 */
router.delete(
  '/customers/:customerId',
  asRateLimitHandler(strictRateLimiter()), // Security for customer deletion
  validateParams(customerIdParamsSchema),
  asRouteHandler(emailGatingCtrl.deleteCustomer)
);

// ===== CUSTOMER IMPORT OPERATIONS =====

/**
 * POST /api/email-gating/customers/import-csv
 * Import customers from CSV data with validation and error handling
 * 
 * @requires authentication: business/brand
 * @requires plan: Growth or higher for bulk imports
 * @requires validation: CSV data
 * @rate-limited: strict to prevent bulk import abuse
 */
router.post(
  '/customers/import-csv',
  asRateLimitHandler(strictRateLimiter()), // Prevent abuse of bulk CSV imports
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Bulk imports require Growth+
  validateBody(csvImportSchema),
  asRouteHandler(emailGatingCtrl.importFromCSV)
);

/**
 * POST /api/email-gating/customers/sync-shopify
 * Sync customers from Shopify integration automatically
 * 
 * @requires authentication: business/brand
 * @requires plan: Premium or higher for advanced integrations
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/customers/sync-shopify',
  asRateLimitHandler(strictRateLimiter()), // Prevent sync abuse
  requireTenantPlan(['premium', 'enterprise']), // Advanced integrations require Premium+
  asRouteHandler(emailGatingCtrl.syncFromShopify)
);

// ===== CUSTOMER ACCESS CONTROL =====

/**
 * GET /api/email-gating/check/:email
 * Check if email is allowed access to voting platform
 * 
 * @requires authentication: business/brand
 * @requires validation: email parameter
 * @rate-limited: dynamic based on plan
 * @note: This endpoint is used by voting platform to validate access
 */
router.get(
  '/check/:email',
  validateParams(emailCheckParamsSchema),
  asRouteHandler(emailGatingCtrl.checkEmailAccess)
);

/**
 * POST /api/email-gating/customers/:customerId/revoke
 * Revoke voting access for a specific customer
 * 
 * @requires authentication: business/brand
 * @requires validation: customer ID parameter and optional reason
 * @rate-limited: strict for security
 */
router.post(
  '/customers/:customerId/revoke',
  asRateLimitHandler(strictRateLimiter()), // Security for access revocation
  validateParams(customerIdParamsSchema),
  validateBody(customerAccessActionSchema),
  asRouteHandler(emailGatingCtrl.revokeCustomerAccess)
);

/**
 * POST /api/email-gating/customers/:customerId/restore
 * Restore voting access for a previously revoked customer
 * 
 * @requires authentication: business/brand
 * @requires validation: customer ID parameter
 * @rate-limited: strict for security
 */
router.post(
  '/customers/:customerId/restore',
  asRateLimitHandler(strictRateLimiter()), // Security for access restoration
  validateParams(customerIdParamsSchema),
  asRouteHandler(emailGatingCtrl.restoreCustomerAccess)
);

/**
 * PUT /api/email-gating/customers/bulk-access
 * Bulk update customer access (grant or revoke for multiple customers)
 * 
 * @requires authentication: business/brand
 * @requires validation: customer IDs and access settings
 * @rate-limited: strict to prevent bulk operation abuse
 */
router.put(
  '/customers/bulk-access',
  asRateLimitHandler(strictRateLimiter()), // Prevent abuse of bulk access operations
  validateBody(bulkAccessSchema),
  asRouteHandler(emailGatingCtrl.bulkUpdateAccess)
);

// ===== ANALYTICS & INSIGHTS =====

/**
 * GET /api/email-gating/analytics
 * Get comprehensive customer analytics and engagement insights
 * 
 * @requires authentication: business/brand
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/analytics',
  asRouteHandler(emailGatingCtrl.getCustomerAnalytics)
);

/**
 * GET /api/email-gating/customers/insights
 * Get customer insights and engagement analysis
 * 
 * @requires authentication: business/brand
 * @requires plan: Premium or higher for advanced analytics
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/customers/insights',
  requireTenantPlan(['premium', 'enterprise']), // Advanced insights require Premium+
  (req, res, next) => {
    // Use the analytics controller for insights
    asRouteHandler(emailGatingCtrl.getCustomerAnalytics)(req, res, next);
  }
);

/**
 * GET /api/email-gating/dashboard
 * Get dashboard overview with key metrics and recommendations
 * 
 * @requires authentication: business/brand
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/dashboard',
  (req, res, next) => {
    // Combine settings and analytics for dashboard view
    Promise.all([
      asRouteHandler(emailGatingCtrl.getEmailGatingSettings)(req, res, () => {}),
      asRouteHandler(emailGatingCtrl.getCustomerAnalytics)(req, res, () => {})
    ]).then(() => {
      // This would be handled by a dedicated dashboard controller method
      // For now, redirect to analytics
      asRouteHandler(emailGatingCtrl.getCustomerAnalytics)(req, res, next);
    }).catch(next);
  }
);

// ===== LEGACY COMPATIBILITY =====

/**
 * GET /api/allowed-customers (legacy route)
 * Legacy compatibility for old customer listing endpoint
 * 
 * @deprecated Use /api/email-gating/customers instead
 * @requires authentication: business/brand
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/legacy/allowed-customers',
  validateQuery(customerListQuerySchema),
  (req, res, next) => {
    // Add deprecation warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /api/email-gating/customers instead.');
    // Type cast to match controller expectations
    asRouteHandler(emailGatingCtrl.getCustomers)(req, res, next);
  }
);

/**
 * POST /api/allowed-customers (legacy route)
 * Legacy compatibility for old customer import endpoint
 * 
 * @deprecated Use /api/email-gating/customers instead
 * @requires authentication: business/brand
 * @rate-limited: strict to prevent import abuse
 */
router.post(
  '/legacy/allowed-customers',
  asRateLimitHandler(strictRateLimiter()),
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(customersImportSchema),
  (req, res, next) => {
    // Add deprecation warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /api/email-gating/customers instead.');
    // Type cast to match controller expectations
    asRouteHandler(emailGatingCtrl.addCustomers)(req, res, next);
  }
);

export default router;
