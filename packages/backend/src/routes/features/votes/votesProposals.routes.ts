// src/routes/features/votes/votesProposals.routes.ts
// Vote proposals routes using modular vote proposals controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesProposalsController } from '../../../controllers/features/votes/votesProposals.controller';

const objectIdSchema = Joi.string().hex().length(24);

const businessProposalsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  searchQuery: Joi.string().trim().max(500).optional(),
  search: Joi.string().trim().max(500).optional(),
  status: Joi.string().valid('draft', 'active', 'completed', 'failed', 'pending', 'succeeded', 'cancelled', 'deactivated').optional(),
  limit: Joi.number().integer().min(1).max(500).optional(),
  useCache: Joi.boolean().optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get business proposals
builder.get(
  '/',
  createHandler(votesProposalsController, 'getBusinessProposals'),
  {
    validateQuery: businessProposalsQuerySchema
  }
);

export default builder.getRouter();