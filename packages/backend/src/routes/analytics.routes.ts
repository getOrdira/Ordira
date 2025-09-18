
// src/routes/analytics.routes.ts

import { Router } from 'express';
import { resolveTenant, requireTenantPlan } from '../middleware/tenant.middleware';
import { authenticate, requireManufacturer } from '../middleware/unifiedAuth.middleware';
import { validateQuery, validateParams, validateBody } from '../middleware/validation.middleware';
import { asRouteHandler } from '../utils/routeHelpers';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import * as analyticsCtrl from '../controllers/analytics.controller';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas for analytics endpoints
 */
const baseAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  format: Joi.string()
    .valid('json', 'csv', 'xlsx')
    .default('json')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid('votes', 'certificates', 'connections', 'revenue', 'transactions', 'engagement'))
    .min(1)
    .max(10)
    .optional()
});

// UPDATED: Product selection voting analytics schema
const votesAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  proposalId: Joi.string().trim().max(100).optional(), // Updated for flexible proposal IDs
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'total_votes', 'participation_rate', 'proposal_success_rate',
      'total_selections', 'product_popularity', 'unique_voters'
    ))
    .min(1)
    .max(10)
    .optional(),
  // NEW: Product-specific filters for product selection voting
  productId: Joi.string().trim().max(100).optional(),
  includeProductDetails: Joi.boolean().default(true).optional()
});

const transactionsAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  type: Joi.string()
    .valid('all', 'nft_mint', 'vote_batch', 'certificate_issue', 'product_selection')
    .default('all')
    .optional(),
  status: Joi.string()
    .valid('pending', 'confirmed', 'failed')
    .optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional()
});

// UPDATED: Certificate/NFT analytics schema
const certificateAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  includeMarketData: Joi.boolean().default(false).optional(),
  includeHolderAnalysis: Joi.boolean().default(false).optional()
});

const manufacturerAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  brandId: Joi.string().hex().length(24).optional(),
  metrics: Joi.array()
    .items(Joi.string().valid('connections', 'orders', 'certificates', 'revenue', 'product_selections'))
    .optional()
});

// Export analytics schema
const exportAnalyticsSchema = Joi.object({
  type: Joi.string()
    .valid('votes', 'transactions', 'certificates', 'products', 'engagement')
    .required(),
  format: Joi.string()
    .valid('csv', 'xlsx', 'json', 'pdf')
    .default('csv'),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  includeRawData: Joi.boolean().default(false),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
});

// Custom report schema
const customReportSchema = Joi.object({
  reportType: Joi.string()
    .valid('comprehensive', 'voting', 'products', 'certificates', 'engagement', 'financial')
    .default('comprehensive'),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d'),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'product_selections', 'voting_trends', 'certificate_analytics', 
      'user_engagement', 'revenue_analysis', 'blockchain_activity'
    ))
    .min(1)
    .required(),
  format: Joi.string()
    .valid('json', 'pdf', 'excel')
    .default('json'),
  includeCharts: Joi.boolean().default(true),
  includeRecommendations: Joi.boolean().default(true)
});

// Comparative analytics schema
const comparativeAnalyticsSchema = Joi.object({
  currentPeriod: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
  }).required(),
  previousPeriod: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
  }).required(),
  metrics: Joi.array()
    .items(Joi.string().valid('votes', 'certificates', 'connections', 'revenue'))
    .min(1)
    .required()
});

/**
 * CORE ANALYTICS ENDPOINTS - ONLY EXISTING CONTROLLER METHODS
 */

/**
 * Get comprehensive business analytics overview
 * GET /api/analytics/overview
 * Maps to: asRouteHandler(analyticsCtrl.getDashboardAnalytics)
 */
router.get(
  '/overview',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(baseAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getDashboardAnalytics)
);

/**
 * Get product selection voting analytics
 * GET /api/analytics/votes
 * Maps to: asRouteHandler(analyticsCtrl.getVotesAnalytics)
 */
router.get(
  '/votes',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(votesAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getVotesAnalytics)
);

/**
 * Get product analytics
 * GET /api/analytics/products
 * Maps to: asRouteHandler(analyticsCtrl.getProductAnalytics)
 */
router.get(
  '/products',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(baseAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getProductAnalytics)
);

/**
 * Get blockchain transaction analytics
 * GET /api/analytics/transactions
 * Maps to: asRouteHandler(analyticsCtrl.getTransactionsAnalytics)
 */
router.get(
  '/transactions',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(transactionsAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getTransactionsAnalytics)
);

/**
 * Get NFT/certificate analytics
 * GET /api/analytics/certificates
 * Maps to: asRouteHandler(analyticsCtrl.getNftAnalytics)
 */
router.get(
  '/certificates',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(certificateAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getNftAnalytics)
);

/**
 * Get engagement analytics
 * GET /api/analytics/engagement
 * Maps to: asRouteHandler(analyticsCtrl.getEngagementAnalytics)
 */
router.get(
  '/engagement',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(baseAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getEngagementAnalytics)
);

/**
 * Get real-time analytics dashboard data
 * GET /api/analytics/dashboard
 * Maps to: asRouteHandler(analyticsCtrl.getDashboardAnalytics)
 */
router.get(
  '/dashboard',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  asRouteHandler(analyticsCtrl.getDashboardAnalytics)
);

/**
 * MANUFACTURER ANALYTICS - EXISTING CONTROLLER METHODS ONLY
 */

/**
 * Get manufacturer analytics (Manufacturer only)
 * GET /api/analytics/manufacturer
 * Maps to: asRouteHandler(analyticsCtrl.getManufacturerAnalytics)
 */
router.get(
  '/manufacturer',
  authenticate, requireManufacturer,
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(manufacturerAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getManufacturerAnalytics)
);

/**
 * Get manufacturer analytics for specific brand
 * GET /api/analytics/manufacturer/brands/:brandId
 * Maps to: asRouteHandler(analyticsCtrl.getManufacturerBrandAnalytics)
 */
router.get(
  '/manufacturer/brands/:brandId',
  authenticate, requireManufacturer,
  dynamicRateLimiter(), // FIXED: No parameters
  validateParams(Joi.object({
    brandId: Joi.string().hex().length(24).required()
  })),
  validateQuery(manufacturerAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getManufacturerBrandAnalytics)
);

/**
 * SPECIFIC ANALYTICS ENDPOINTS - EXISTING CONTROLLER METHODS ONLY
 */

/**
 * Get analytics for specific proposal/selection round
 * GET /api/analytics/proposals/:proposalId
 * Maps to: asRouteHandler(analyticsCtrl.getProposalAnalytics)
 */
router.get(
  '/proposals/:proposalId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateParams(Joi.object({
    proposalId: Joi.string().trim().max(100).required() // Updated for flexible proposal IDs
  })),
  validateQuery(votesAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getProposalAnalytics)
);

/**
 * Get analytics for specific product
 * GET /api/analytics/products/:productId
 * Maps to: asRouteHandler(analyticsCtrl.getProductAnalyticsById)
 */
router.get(
  '/products/:productId',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // FIXED: No parameters
  validateParams(Joi.object({
    productId: Joi.string().trim().max(100).required()
  })),
  validateQuery(baseAnalyticsQuerySchema),
  asRouteHandler(analyticsCtrl.getProductAnalyticsById)
);

/**
 * EXPORT AND REPORTING - EXISTING CONTROLLER METHODS ONLY
 */

/**
 * Export analytics data
 * POST /api/analytics/export
 * Maps to: asRouteHandler(analyticsCtrl.exportAnalytics)
 */
router.post(
  '/export',
  resolveTenant,
  authenticate,
  requireTenantPlan(['enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateBody(exportAnalyticsSchema),
  asRouteHandler(analyticsCtrl.exportAnalytics)
);

/**
 * Generate custom analytics reports
 * POST /api/analytics/custom-report
 * Maps to: asRouteHandler(analyticsCtrl.generateCustomReport)
 */
router.post(
  '/custom-report',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateBody(customReportSchema),
  asRouteHandler(analyticsCtrl.generateCustomReport)
);

/**
 * Get comparative analytics between date ranges
 * POST /api/analytics/compare
 * Maps to: asRouteHandler(analyticsCtrl.getComparativeAnalytics)
 */
router.post(
  '/compare',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateBody(comparativeAnalyticsSchema),
  asRouteHandler(analyticsCtrl.getComparativeAnalytics)
);

/**
 * LEGACY COMPATIBILITY
 */

/**
 * Legacy NFT analytics endpoint (maps to certificates)
 * GET /api/analytics/nfts
 * Maps to: asRouteHandler(analyticsCtrl.getNftAnalytics)
 */
router.get(
  '/nfts',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // FIXED: No parameters
  validateQuery(certificateAnalyticsQuerySchema),
  (req, res, next) => {
    // Add deprecation warning header
    res.setHeader('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /api/analytics/certificates instead.');
    next();
  },
  asRouteHandler(analyticsCtrl.getNftAnalytics)
);

export default router;
