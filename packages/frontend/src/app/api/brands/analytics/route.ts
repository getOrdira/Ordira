// src/routes/brands/analytics.routes.ts
import { Router } from 'express';
import { validateQuery, validateParams, validateBody } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as analyticsCtrl from '../../controllers/brands/analytics.controller';
import {
  analyticsQuerySchema,
  dashboardAnalyticsSchema,
  exportAnalyticsSchema,
  compareAnalyticsSchema,
  realtimeAnalyticsSchema,
  customReportSchema
} from '../../validation/brands/analytics.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/brands/analytics/overview
 * Get comprehensive business analytics overview
 */
router.get(
  '/overview',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.overview),
  analyticsCtrl.getOverviewAnalytics
);

/**
 * GET /api/brands/analytics/dashboard
 * Get real-time dashboard analytics with KPIs
 */
router.get(
  '/dashboard',
  validateQuery(dashboardAnalyticsSchema),
  analyticsCtrl.getDashboardAnalytics
);

/**
 * GET /api/brands/analytics/performance
 * Get performance metrics and trends
 */
router.get(
  '/performance',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.performance),
  analyticsCtrl.getPerformanceAnalytics
);

/**
 * GET /api/brands/analytics/revenue
 * Get revenue analytics and financial metrics
 */
router.get(
  '/revenue',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.revenue),
  analyticsCtrl.getRevenueAnalytics
);

/**
 * GET /api/brands/analytics/certificates
 * Get certificate issuance and performance analytics
 */
router.get(
  '/certificates',
  validateQuery(analyticsQuerySchema.certificates),
  analyticsCtrl.getCertificateAnalytics
);

/**
 * GET /api/brands/analytics/voting
 * Get voting engagement and proposal analytics
 */
router.get(
  '/voting',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.voting),
  analyticsCtrl.getVotingAnalytics
);

/**
 * GET /api/brands/analytics/products
 * Get product performance analytics
 */
router.get(
  '/products',
  validateQuery(analyticsQuerySchema.products),
  analyticsCtrl.getProductAnalytics
);

/**
 * GET /api/brands/analytics/products/:productId
 * Get analytics for specific product
 */
router.get(
  '/products/:productId',
  validateParams(analyticsQuerySchema.productParams),
  validateQuery(analyticsQuerySchema.productDetails),
  analyticsCtrl.getProductAnalyticsById
);

/**
 * GET /api/brands/analytics/engagement
 * Get customer engagement analytics
 */
router.get(
  '/engagement',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.engagement),
  analyticsCtrl.getEngagementAnalytics
);

/**
 * GET /api/brands/analytics/manufacturers
 * Get manufacturer partnership analytics
 */
router.get(
  '/manufacturers',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.manufacturers),
  analyticsCtrl.getManufacturerAnalytics
);

/**
 * GET /api/brands/analytics/web3
 * Get Web3 transaction and wallet analytics
 */
router.get(
  '/web3',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.web3),
  analyticsCtrl.getWeb3Analytics
);

/**
 * GET /api/brands/analytics/integrations
 * Get third-party integration analytics
 */
router.get(
  '/integrations',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.integrations),
  analyticsCtrl.getIntegrationAnalytics
);

/**
 * GET /api/brands/analytics/realtime
 * Get real-time analytics data
 */
router.get(
  '/realtime',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(realtimeAnalyticsSchema),
  analyticsCtrl.getRealtimeAnalytics
);

/**
 * GET /api/brands/analytics/predictions
 * Get AI-powered analytics predictions
 */
router.get(
  '/predictions',
  requireTenantPlan(['enterprise']),
  validateQuery(analyticsQuerySchema.predictions),
  analyticsCtrl.getPredictiveAnalytics
);

/**
 * GET /api/brands/analytics/benchmarks
 * Get industry benchmark comparisons
 */
router.get(
  '/benchmarks',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.benchmarks),
  analyticsCtrl.getBenchmarkAnalytics
);

/**
 * POST /api/brands/analytics/compare
 * Compare analytics between different time periods
 */
router.post(
  '/compare',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(compareAnalyticsSchema),
  analyticsCtrl.compareAnalytics
);

/**
 * POST /api/brands/analytics/custom-report
 * Generate custom analytics report
 */
router.post(
  '/custom-report',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(), // Prevent report generation abuse
  validateBody(customReportSchema),
  analyticsCtrl.generateCustomReport
);

/**
 * GET /api/brands/analytics/export
 * Export analytics data in various formats
 */
router.get(
  '/export',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateQuery(exportAnalyticsSchema),
  analyticsCtrl.exportAnalytics
);

/**
 * GET /api/brands/analytics/audit-trail
 * Get analytics audit trail and access logs
 */
router.get(
  '/audit-trail',
  requireTenantPlan(['enterprise']),
  validateQuery(analyticsQuerySchema.auditTrail),
  analyticsCtrl.getAnalyticsAuditTrail
);

/**
 * GET /api/brands/analytics/alerts
 * Get analytics-based alerts and notifications
 */
router.get(
  '/alerts',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.alerts),
  analyticsCtrl.getAnalyticsAlerts
);

/**
 * POST /api/brands/analytics/alerts
 * Configure analytics alert thresholds
 */
router.post(
  '/alerts',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(analyticsQuerySchema.alertConfig),
  analyticsCtrl.configureAnalyticsAlerts
);

/**
 * GET /api/brands/analytics/cohorts
 * Get customer cohort analysis
 */
router.get(
  '/cohorts',
  requireTenantPlan(['enterprise']),
  validateQuery(analyticsQuerySchema.cohorts),
  analyticsCtrl.getCohortAnalytics
);

/**
 * GET /api/brands/analytics/funnels
 * Get conversion funnel analytics
 */
router.get(
  '/funnels',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(analyticsQuerySchema.funnels),
  analyticsCtrl.getFunnelAnalytics
);

/**
 * GET /api/brands/analytics/attribution
 * Get attribution and customer journey analytics
 */
router.get(
  '/attribution',
  requireTenantPlan(['enterprise']),
  validateQuery(analyticsQuerySchema.attribution),
  analyticsCtrl.getAttributionAnalytics
);

export default router;