// src/routes/features/votes/votesAnalytics.routes.ts
// Vote analytics routes using modular vote analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesAnalyticsController } from '../../../controllers/features/votes/votesAnalytics.controller';

const objectIdSchema = Joi.string().hex().length(24);

const votingAnalyticsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  includeRecommendations: Joi.boolean().optional(),
  includeTrends: Joi.boolean().optional(),
  useCache: Joi.boolean().optional(),
  proposalId: Joi.string().trim().max(200).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get voting analytics
builder.get(
  '/',
  createHandler(votesAnalyticsController, 'getVotingAnalytics'),
  {
    validateQuery: votingAnalyticsQuerySchema
  }
);

export default builder.getRouter();