// src/routes/features/subscriptions/subscriptionsUsage.routes.ts
// Subscription usage routes using modular subscription usage controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsUsageController } from '../../../controllers/features/subscriptions/subscriptionsUsage.controller';

const objectIdSchema = Joi.string().hex().length(24);

const usageCheckBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  amount: Joi.number().integer().min(1).optional()
});

const usageRecordBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  count: Joi.number().integer().min(1).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Check voting limits
builder.post(
  '/check-voting',
  createHandler(subscriptionsUsageController, 'checkVotingLimits'),
  {
    validateBody: usageCheckBodySchema
  }
);

// Check NFT limits
builder.post(
  '/check-nft',
  createHandler(subscriptionsUsageController, 'checkNftLimits'),
  {
    validateBody: usageCheckBodySchema
  }
);

// Check API limits
builder.post(
  '/check-api',
  createHandler(subscriptionsUsageController, 'checkApiLimits'),
  {
    validateBody: usageCheckBodySchema
  }
);

// Record vote usage
builder.post(
  '/record-vote',
  createHandler(subscriptionsUsageController, 'recordVoteUsage'),
  {
    validateBody: usageRecordBodySchema
  }
);

// Record NFT usage
builder.post(
  '/record-nft',
  createHandler(subscriptionsUsageController, 'recordNftUsage'),
  {
    validateBody: usageRecordBodySchema
  }
);

// Record API usage
builder.post(
  '/record-api',
  createHandler(subscriptionsUsageController, 'recordApiUsage'),
  {
    validateBody: usageRecordBodySchema
  }
);

// Get voting limits
builder.get(
  '/voting-limits',
  createHandler(subscriptionsUsageController, 'getVotingLimits')
);

// Get NFT limits
builder.get(
  '/nft-limits',
  createHandler(subscriptionsUsageController, 'getNftLimits')
);

export default builder.getRouter();