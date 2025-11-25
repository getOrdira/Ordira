// src/routes/features/votes/votesDashboard.routes.ts
// Vote dashboard routes using modular vote dashboard controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesDashboardController } from '../../../controllers/features/votes/votesDashboard.controller';

const objectIdSchema = Joi.string().hex().length(24);

const votingDashboardQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const clearCachesQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get voting dashboard
builder.get(
  '/',
  createHandler(votesDashboardController, 'getVotingDashboard'),
  {
    validateQuery: votingDashboardQuerySchema
  }
);

// Clear voting caches
builder.post(
  '/clear-caches',
  createHandler(votesDashboardController, 'clearVotingCaches'),
  {
    validateQuery: clearCachesQuerySchema
  }
);

// Get voting service health
builder.get(
  '/health',
  createHandler(votesDashboardController, 'getVotingServiceHealth')
);

export default builder.getRouter();