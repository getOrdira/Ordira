// src/routes/products/analytics.routes.ts
import { Router } from 'express';
import { validateQuery } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as productAnalyticsCtrl from '../../controllers/products/analytics.controller';
import { productValidationSchemas } from '../../validation/product.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * GET /api/products/:id/analytics
 * Get comprehensive product analytics
 */
router.get(
  '/',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_analytics'),
  productAnalyticsCtrl.getProductAnalytics
);

/**
 * GET /api/products/:id/analytics/votes
 * Get voting analytics for product
 */
router.get(
  '/votes',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_vote_analytics'),
  productAnalyticsCtrl.getProductVoteAnalytics
);

/**
 * GET /api/products/:id/analytics/certificates
 * Get certificate analytics for product
 */
router.get(
  '/certificates',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_certificate_analytics'),
  productAnalyticsCtrl.getProductCertificateAnalytics
);

/**
 * GET /api/products/:id/analytics/engagement
 * Get engagement analytics
 */
router.get(
  '/engagement',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_engagement_analytics'),
  productAnalyticsCtrl.getProductEngagementAnalytics
);

/**
 * GET /api/products/:id/analytics/performance
 * Get performance metrics
 */
router.get(
  '/performance',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_performance'),
  productAnalyticsCtrl.getProductPerformance
);

/**
 * GET /api/products/:id/analytics/trends
 * Get trend analysis
 */
router.get(
  '/trends',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_trends'),
  productAnalyticsCtrl.getProductTrends
);

/**
 * GET /api/products/:id/analytics/timeline
 * Get activity timeline
 */
router.get(
  '/timeline',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('view_product_timeline'),
  productAnalyticsCtrl.getProductTimeline
);

/**
 * GET /api/products/:id/analytics/export
 * Export analytics data
 */
router.get(
  '/export',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('export_product_analytics'),
  productAnalyticsCtrl.exportProductAnalytics
);

export default router;