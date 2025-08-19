// src/routes/emailGating.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
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

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate); // Require brand authentication
router.use(resolveTenant);

// ===== EMAIL GATING SETTINGS =====

/**
 * GET /api/email-gating/settings
 * Get email gating configuration
 */
router.get(
  '/settings',
  trackManufacturerAction('view_email_gating_settings'),
  emailGatingCtrl.getEmailGatingSettings
);

/**
 * PUT /api/email-gating/settings
 * Update email gating configuration
 */
router.put(
  '/settings',
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Email gating is a premium feature
  validateBody(emailGatingSettingsSchema),
  trackManufacturerAction('update_email_gating_settings'),
  emailGatingCtrl.updateEmailGatingSettings
);

// ===== CUSTOMER MANAGEMENT =====

/**
 * GET /api/email-gating/customers
 * List allowed customers with filtering
 */
router.get(
  '/customers',
  validateQuery(customerListQuerySchema),
  trackManufacturerAction('view_allowed_customers'),
  emailGatingCtrl.getCustomers
);

/**
 * POST /api/email-gating/customers
 * Add customers manually or via API
 */
router.post(
  '/customers',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(), // Prevent abuse
  validateBody(customersImportSchema),
  trackManufacturerAction('add_customers_manual'),
  emailGatingCtrl.addCustomers
);

/**
 * POST /api/email-gating/customers/import-csv
 * Import customers from CSV data
 */
router.post(
  '/customers/import-csv',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(), // Prevent abuse of bulk imports
  validateBody(csvImportSchema),
  trackManufacturerAction('import_customers_csv'),
  emailGatingCtrl.importFromCSV
);

/**
 * POST /api/email-gating/customers/sync-shopify
 * Sync customers from Shopify integration
 */
router.post(
  '/customers/sync-shopify',
  requireTenantPlan(['premium', 'enterprise']), // Advanced integration feature
  strictRateLimiter(),
  trackManufacturerAction('sync_customers_shopify'),
  emailGatingCtrl.syncFromShopify
);

/**
 * DELETE /api/email-gating/customers/:customerId
 * Delete customer from allowed list
 */
router.delete(
  '/customers/:customerId',
  validateParams(customerAccessParamsSchema),
  trackManufacturerAction('delete_customer'),
  emailGatingCtrl.deleteCustomer
);

// ===== CUSTOMER ACCESS CONTROL =====

/**
 * GET /api/email-gating/check/:email
 * Check if email is allowed access (public endpoint for voting platform)
 */
router.get(
  '/check/:email',
  validateParams(emailCheckParamsSchema),
  emailGatingCtrl.checkEmailAccess
);

/**
 * POST /api/email-gating/customers/:customerId/revoke
 * Revoke voting access for a customer
 */
router.post(
  '/customers/:customerId/revoke',
  validateParams(customerAccessParamsSchema),
  validateBody(customerAccessParamsSchema.revoke),
  trackManufacturerAction('revoke_customer_access'),
  emailGatingCtrl.revokeCustomerAccess
);

/**
 * POST /api/email-gating/customers/:customerId/restore
 * Restore voting access for a customer
 */
router.post(
  '/customers/:customerId/restore',
  validateParams(customerAccessParamsSchema),
  trackManufacturerAction('restore_customer_access'),
  emailGatingCtrl.restoreCustomerAccess
);

/**
 * PUT /api/email-gating/customers/bulk-access
 * Bulk update customer access (grant or revoke)
 */
router.put(
  '/customers/bulk-access',
  strictRateLimiter(), // Prevent abuse of bulk operations
  validateBody(bulkAccessSchema),
  trackManufacturerAction('bulk_update_customer_access'),
  emailGatingCtrl.bulkUpdateAccess
);

// ===== ANALYTICS =====

/**
 * GET /api/email-gating/analytics
 * Get customer analytics and insights
 */
router.get(
  '/analytics',
  trackManufacturerAction('view_customer_analytics'),
  emailGatingCtrl.getCustomerAnalytics
);

export default router;