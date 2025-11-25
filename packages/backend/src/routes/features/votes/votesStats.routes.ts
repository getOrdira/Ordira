// src/routes/features/votes/votesStats.routes.ts
// Vote stats routes using modular vote stats controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesStatsController } from '../../../controllers/features/votes/votesStats.controller';

const objectIdSchema = Joi.string().hex().length(24);

const votingStatsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  useCache: Joi.boolean().optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get voting stats
builder.get(
  '/',
  createHandler(votesStatsController, 'getVotingStats'),
  {
    validateQuery: votingStatsQuerySchema
  }
);

export default builder.getRouter();