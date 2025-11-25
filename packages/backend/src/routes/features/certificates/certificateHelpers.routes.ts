// src/routes/features/certificates/certificateHelpers.routes.ts
// Certificate helpers routes using modular certificate helpers controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { certificateHelpersController } from '../../../controllers/features/certificates/certificateHelpers.controller';

const objectIdSchema = Joi.string().hex().length(24);

const certificateIdParamsSchema = Joi.object({
  certificateId: objectIdSchema.required()
});

const validateRecipientBodySchema = Joi.object({
  recipient: Joi.string().trim().max(320).required(),
  contactMethod: Joi.string().valid('email', 'sms', 'wallet').required()
});

const validateProductOwnershipBodySchema = Joi.object({
  productId: objectIdSchema.required()
});

const nextStepsBodySchema = Joi.object({
  hasWeb3: Joi.boolean().required(),
  shouldAutoTransfer: Joi.boolean().required(),
  transferScheduled: Joi.boolean().required()
});

const transferUsageQuerySchema = Joi.object({
  includeAnalytics: Joi.boolean().optional()
});

const planQuerySchema = Joi.object({
  plan: Joi.string().trim().max(50).required()
});

const gasCostBodySchema = Joi.object({
  recipientCount: Joi.number().integer().min(1).max(5000).required()
});

const monthlyGrowthBodySchema = Joi.object({
  monthlyStats: Joi.array()
    .items(
      Joi.object({
        month: Joi.string().trim().max(20).required(),
        transfers: Joi.number().integer().min(0).required()
      })
    )
    .min(1)
    .max(36)
    .required()
});

const web3InsightsBodySchema = Joi.object({
  certificateAnalytics: Joi.object().unknown(true).required(),
  transferAnalytics: Joi.object().unknown(true).required()
});

const web3RecommendationsBodySchema = web3InsightsBodySchema.keys({
  plan: Joi.string().trim().max(50).required()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.post(
  '/validate-recipient',
  createHandler(certificateHelpersController, 'validateRecipient'),
  {
    validateBody: validateRecipientBodySchema
  }
);

builder.post(
  '/validate-product-ownership',
  createHandler(certificateHelpersController, 'validateProductOwnership'),
  {
    validateBody: validateProductOwnershipBodySchema
  }
);

builder.get(
  '/:certificateId/ownership-status',
  createHandler(certificateHelpersController, 'getOwnershipStatus'),
  {
    validateParams: certificateIdParamsSchema
  }
);

builder.get(
  '/:certificateId/transfer-health',
  createHandler(certificateHelpersController, 'getTransferHealth'),
  {
    validateParams: certificateIdParamsSchema
  }
);

builder.post(
  '/next-steps',
  createHandler(certificateHelpersController, 'getCertificateNextSteps'),
  {
    validateBody: nextStepsBodySchema
  }
);

builder.get(
  '/transfer-usage',
  createHandler(certificateHelpersController, 'getTransferUsage'),
  {
    validateQuery: transferUsageQuerySchema
  }
);

builder.get(
  '/transfer-limits',
  createHandler(certificateHelpersController, 'getTransferLimits'),
  {
    validateQuery: planQuerySchema
  }
);

builder.get(
  '/plan-limits',
  createHandler(certificateHelpersController, 'getPlanLimits'),
  {
    validateQuery: planQuerySchema
  }
);

builder.post(
  '/calculate-gas-cost',
  createHandler(certificateHelpersController, 'calculateEstimatedGasCost'),
  {
    validateBody: gasCostBodySchema
  }
);

builder.post(
  '/calculate-monthly-growth',
  createHandler(certificateHelpersController, 'calculateMonthlyGrowth'),
  {
    validateBody: monthlyGrowthBodySchema
  }
);

builder.post(
  '/generate-web3-insights',
  createHandler(certificateHelpersController, 'generateWeb3Insights'),
  {
    validateBody: web3InsightsBodySchema
  }
);

builder.post(
  '/generate-web3-recommendations',
  createHandler(certificateHelpersController, 'generateWeb3Recommendations'),
  {
    validateBody: web3RecommendationsBodySchema
  }
);

export default builder.getRouter();
