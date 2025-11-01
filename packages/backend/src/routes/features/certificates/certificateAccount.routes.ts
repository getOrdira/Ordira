// src/routes/features/certificates/certificateAccount.routes.ts
// Certificate account routes using modular certificate account controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { certificateAccountController } from '../../../controllers/features/certificates/certificateAccount.controller';

const objectIdSchema = Joi.string().hex().length(24);

const certificateIdParamsSchema = Joi.object({
  certificateId: objectIdSchema.required()
});

const statsQuerySchema = Joi.object({
  includeDistribution: Joi.boolean().optional(),
  includeWallet: Joi.boolean().optional()
});

const usageQuerySchema = Joi.object({
  timeframe: Joi.string().valid('month', 'year', 'all').optional()
});

const transferUsageQuerySchema = Joi.object({
  includeAnalytics: Joi.boolean().optional()
});

const distributionQuerySchema = Joi.object({
  groupBy: Joi.string().valid('status', 'product', 'month').optional()
});

const monthlyTrendsQuerySchema = Joi.object({
  monthsBack: Joi.number().integer().min(1).max(24).optional()
});

const planLimitsQuerySchema = Joi.object({
  planType: Joi.string().trim().max(100).optional()
});

const successRateQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30)
});

const transferStatisticsQuerySchema = Joi.object({
  includeSuccessRate: Joi.boolean().optional(),
  includeAverageTime: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.get(
  '/stats',
  createHandler(certificateAccountController, 'getCertificateStats'),
  {
    validateQuery: statsQuerySchema
  }
);

builder.get(
  '/usage',
  createHandler(certificateAccountController, 'getCertificateUsage'),
  {
    validateQuery: usageQuerySchema
  }
);

builder.get(
  '/transfer-usage',
  createHandler(certificateAccountController, 'getTransferUsage'),
  {
    validateQuery: transferUsageQuerySchema
  }
);

builder.get(
  '/distribution',
  createHandler(certificateAccountController, 'getCertificateDistribution'),
  {
    validateQuery: distributionQuerySchema
  }
);

builder.get(
  '/monthly-trends',
  createHandler(certificateAccountController, 'getMonthlyCertificateTrends'),
  {
    validateQuery: monthlyTrendsQuerySchema
  }
);

builder.get(
  '/by-product',
  createHandler(certificateAccountController, 'getCertificatesByProduct')
);

builder.get(
  '/plan-limits',
  createHandler(certificateAccountController, 'checkPlanLimits'),
  {
    validateQuery: planLimitsQuerySchema
  }
);

builder.get(
  '/average-processing-time',
  createHandler(certificateAccountController, 'getAverageProcessingTime')
);

builder.get(
  '/success-rate',
  createHandler(certificateAccountController, 'getSuccessRate'),
  {
    validateQuery: successRateQuerySchema
  }
);

builder.get(
  '/transfer-statistics',
  createHandler(certificateAccountController, 'getTransferStatistics'),
  {
    validateQuery: transferStatisticsQuerySchema
  }
);

builder.get(
  '/global-analytics',
  createHandler(certificateAccountController, 'getGlobalTransferAnalytics')
);

builder.get(
  '/:certificateId/ownership-status',
  createHandler(certificateAccountController, 'getOwnershipStatus'),
  {
    validateParams: certificateIdParamsSchema
  }
);

builder.get(
  '/:certificateId/transfer-health',
  createHandler(certificateAccountController, 'getTransferHealth'),
  {
    validateParams: certificateIdParamsSchema
  }
);

export default builder.getRouter();
