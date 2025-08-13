// src/routes/certificates/list.routes.ts
import { Router } from 'express';
import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as listCtrl from '../../controllers/certificates/list.controller';
import {
  listCertificatesQuerySchema,
  searchCertificatesSchema,
  filterCertificatesSchema,
  exportCertificatesSchema,
  certificateStatsSchema
} from '../../validation/certificates/list.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/certificates/list
 * List certificates with pagination and filtering
 */
router.get(
  '/',
  validateQuery(listCertificatesQuerySchema),
  listCtrl.listCertificates
);

/**
 * GET /api/certificates/list/search
 * Advanced search across certificates
 */
router.get(
  '/search',
  validateQuery(searchCertificatesSchema),
  listCtrl.searchCertificates
);

/**
 * GET /api/certificates/list/filter
 * Get certificates with advanced filtering options
 */
router.get(
  '/filter',
  validateQuery(filterCertificatesSchema),
  listCtrl.getFilteredCertificates
);

/**
 * GET /api/certificates/list/stats
 * Get certificate statistics and overview
 */
router.get(
  '/stats',
  validateQuery(certificateStatsSchema),
  listCtrl.getCertificateStats
);

/**
 * GET /api/certificates/list/recent
 * Get recently created certificates
 */
router.get(
  '/recent',
  validateQuery(listCertificatesQuerySchema.recent),
  listCtrl.getRecentCertificates
);

/**
 * GET /api/certificates/list/pending
 * Get certificates pending blockchain confirmation
 */
router.get(
  '/pending',
  validateQuery(listCertificatesQuerySchema.status),
  listCtrl.getPendingCertificates
);

/**
 * GET /api/certificates/list/failed
 * Get failed certificate creations
 */
router.get(
  '/failed',
  validateQuery(listCertificatesQuerySchema.status),
  listCtrl.getFailedCertificates
);

/**
 * GET /api/certificates/list/transferred
 * Get certificates transferred to brand wallet
 */
router.get(
  '/transferred',
  requireTenantPlan(['premium', 'enterprise']), // Web3 features
  validateQuery(listCertificatesQuerySchema.transferred),
  listCtrl.getTransferredCertificates
);

/**
 * GET /api/certificates/list/revoked
 * Get revoked certificates
 */
router.get(
  '/revoked',
  validateQuery(listCertificatesQuerySchema.status),
  listCtrl.getRevokedCertificates
);

/**
 * GET /api/certificates/list/by-product/:productId
 * Get certificates for specific product
 */
router.get(
  '/by-product/:productId',
  validateParams(listCertificatesQuerySchema.productParams),
  validateQuery(listCertificatesQuerySchema.byProduct),
  listCtrl.getCertificatesByProduct
);

/**
 * GET /api/certificates/list/by-recipient
 * Get certificates for specific recipient
 */
router.get(
  '/by-recipient',
  validateQuery(listCertificatesQuerySchema.byRecipient),
  listCtrl.getCertificatesByRecipient
);

/**
 * GET /api/certificates/list/by-date-range
 * Get certificates within date range
 */
router.get(
  '/by-date-range',
  validateQuery(listCertificatesQuerySchema.dateRange),
  listCtrl.getCertificatesByDateRange
);

/**
 * GET /api/certificates/list/trending
 * Get trending certificates and popular products
 */
router.get(
  '/trending',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(certificateStatsSchema.trending),
  listCtrl.getTrendingCertificates
);

/**
 * GET /api/certificates/list/analytics
 * Get certificate list analytics and insights
 */
router.get(
  '/analytics',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(certificateStatsSchema.analytics),
  listCtrl.getCertificateAnalytics
);

/**
 * GET /api/certificates/list/export
 * Export certificate list in various formats
 */
router.get(
  '/export',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(exportCertificatesSchema),
  listCtrl.exportCertificateList
);

/**
 * GET /api/certificates/list/bulk-operations
 * Get available bulk operations for certificates
 */
router.get(
  '/bulk-operations',
  listCtrl.getAvailableBulkOperations
);

/**
 * GET /api/certificates/list/timeline
 * Get certificate creation timeline
 */
router.get(
  '/timeline',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(certificateStatsSchema.timeline),
  listCtrl.getCertificateTimeline
);

/**
 * GET /api/certificates/list/ownership-distribution
 * Get certificate ownership distribution
 */
router.get(
  '/ownership-distribution',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(certificateStatsSchema.ownership),
  listCtrl.getOwnershipDistribution
);

/**
 * GET /api/certificates/list/performance-metrics
 * Get certificate performance metrics
 */
router.get(
  '/performance-metrics',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(certificateStatsSchema.performance),
  listCtrl.getPerformanceMetrics
);

/**
 * GET /api/certificates/list/auto-refresh
 * Get real-time certificate list updates
 */
router.get(
  '/auto-refresh',
  validateQuery(listCertificatesQuerySchema.autoRefresh),
  listCtrl.getAutoRefreshData
);

/**
 * GET /api/certificates/list/saved-filters
 * Get user's saved filter presets
 */
router.get(
  '/saved-filters',
  listCtrl.getSavedFilters
);

/**
 * POST /api/certificates/list/save-filter
 * Save current filter as preset
 */
router.post(
  '/save-filter',
  validateQuery(filterCertificatesSchema.saveFilter),
  listCtrl.saveFilterPreset
);

/**
 * GET /api/certificates/list/quick-stats
 * Get quick statistics for dashboard
 */
router.get(
  '/quick-stats',
  listCtrl.getQuickStats
);

/**
 * GET /api/certificates/list/health-check
 * Check certificate system health and status
 */
router.get(
  '/health-check',
  listCtrl.getCertificateSystemHealth
);

export default router;