// src/routes/analytics.routes.ts

import { Router } from 'express';
import { resolveTenant } from '../middleware/tenant.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { validateQuery, validateParams } from '../middleware/validation.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import { requireTenantPlan } from '../middleware/tenant.middleware';
import * as analyticsCtrl from '../controllers/analytics.controller';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas for analytics endpoints
 */
const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  granularity: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid('votes', 'certificates', 'connections', 'revenue', 'transactions', 'engagement'))
    .min(1)
    .max(10)
    .optional(),
  format: Joi.string()
    .valid('json', 'csv', 'xlsx')
    .default('json')
    .optional()
});

const votesAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  proposalId: Joi.string().hex().length(24).optional(),
  granularity: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  groupBy: Joi.array()
    .items(Joi.string().valid('proposal', 'voter', 'date', 'status'))
    .max(3)
    .optional()
});

const transactionsAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  type: Joi.string()
    .valid('all', 'nft_mint', 'vote_batch', 'certificate_issue')
    .default('all')
    .optional(),
  status: Joi.string()
    .valid('pending', 'confirmed', 'failed')
    .optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional()
});

const manufacturerAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  brandId: Joi.string().hex().length(24).optional(),
  metrics: Joi.array()
    .items(Joi.string().valid('connections', 'orders', 'certificates', 'revenue'))
    .optional()
});

/**
 * Get comprehensive business analytics (Brand)
 * GET /api/analytics/overview
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @optional query: date range, granularity, metrics
 */
router.get(
  '/overview',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 60 requests per minute
  validateQuery(analyticsQuerySchema),
  analyticsCtrl.getOverviewAnalytics
);

/**
 * Get voting analytics
 * GET /api/analytics/votes
 * 
 * @requires authentication & tenant context
 * @requires growth plan or higher
 * @optional query: date range, proposal filters, grouping
 */
router.get(
  '/votes',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(), // 100 requests per minute
  validateQuery(votesAnalyticsQuerySchema),
  analyticsCtrl.getVotesAnalytics
);

/**
 * Get blockchain transaction analytics
 * GET /api/analytics/transactions
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @optional query: date range, transaction type, status filters
 */
router.get(
  '/transactions',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 60 requests per minute
  validateQuery(transactionsAnalyticsQuerySchema),
  analyticsCtrl.getTransactionsAnalytics
);

/**
 * Get manufacturer analytics (Manufacturer only)
 * GET /api/analytics/manufacturer
 * 
 * @requires manufacturer authentication
 * @optional query: date range, brand filters, metrics
 */
router.get(
  '/manufacturer',
  authenticateManufacturer,
  dynamicRateLimiter(), // 100 requests per minute
  validateQuery(manufacturerAnalyticsQuerySchema),
  analyticsCtrl.getManufacturerAnalytics
);

/**
 * Get certificate analytics
 * GET /api/analytics/certificates
 * 
 * @requires authentication & tenant context
 * @requires growth plan or higher
 * @optional query: date range, product filters
 */
router.get(
  '/certificates',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(),
  validateQuery(analyticsQuerySchema),
  analyticsCtrl.getCertificateAnalytics
);

/**
 * Get product analytics
 * GET /api/analytics/products
 * 
 * @requires authentication & tenant context
 * @optional query: date range, product filters
 */
router.get(
  '/products',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(),
  validateQuery(analyticsQuerySchema),
  analyticsCtrl.getProductAnalytics
);

/**
 * Get engagement analytics
 * GET /api/analytics/engagement
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @optional query: date range, engagement type
 */
router.get(
  '/engagement',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(),
  validateQuery(analyticsQuerySchema),
  analyticsCtrl.getEngagementAnalytics
);

/**
 * Get real-time analytics dashboard data
 * GET /api/analytics/dashboard
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 */
router.get(
  '/dashboard',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 30 requests per minute
  analyticsCtrl.getDashboardAnalytics
);

/**
 * Export analytics data
 * POST /api/analytics/export
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
  dynamicRateLimiter(), // 5 exports per minute
  validateQuery(Joi.object({
    type: Joi.string()
      .valid('votes', 'transactions', 'certificates', 'products', 'engagement')
      .required(),
    format: Joi.string()
      .valid('csv', 'xlsx', 'json')
      .default('csv'),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    includeRawData: Joi.boolean().default(false)
  })),
  analyticsCtrl.exportAnalytics
);

/**
 * Get analytics for specific proposal
 * GET /api/analytics/proposals/:proposalId
 * 
 * @requires authentication & tenant context
 * @requires params: { proposalId: string }
 */
router.get(
  '/proposals/:proposalId',
  resolveTenant,
  authenticate,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  dynamicRateLimiter(),
  validateParams(Joi.object({
    proposalId: Joi.string().hex().length(24).required()
  })),
  analyticsCtrl.getProposalAnalytics
);

/**
 * Get analytics for specific product
 * GET /api/analytics/products/:productId
 * 
 * @requires authentication & tenant context
 * @requires params: { productId: string }
 */
router.get(
  '/products/:productId',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(),
  validateParams(Joi.object({
    productId: Joi.string().hex().length(24).required()
  })),
  analyticsCtrl.getProductAnalyticsById
);

/**
 * Get comparative analytics between date ranges
 * POST /api/analytics/compare
 * 
 * @requires authentication & tenant context
 * @requires premium plan or higher
 * @requires validation: comparison configuration
 */
router.post(
  '/compare',
  resolveTenant,
  authenticate,
  requireTenantPlan(['premium', 'enterprise']),
  dynamicRateLimiter(), // 20 comparisons per minute
  validateQuery(Joi.object({
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
  })),
  analyticsCtrl.getComparativeAnalytics
);

export default router;