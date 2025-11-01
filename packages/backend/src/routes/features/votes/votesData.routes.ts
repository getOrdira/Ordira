// src/routes/features/votes/votesData.routes.ts
// Vote data routes using modular vote data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesDataController } from '../../../controllers/features/votes/votesData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const votesListQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(500).optional(),
  offset: Joi.number().integer().min(0).optional(),
  sortBy: Joi.string().valid('timestamp', 'proposalId', 'voter').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  useCache: Joi.boolean().optional()
});

const pendingVotesQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  proposalId: Joi.string().trim().max(200).optional(),
  userId: Joi.string().trim().max(200).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(500).optional(),
  offset: Joi.number().integer().min(0).optional(),
  useCache: Joi.boolean().optional()
});

const proposalStatsParamsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  proposalId: Joi.string().trim().max(200).optional()
});

const activityQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
});

const contractAddressQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const countsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Get business votes
builder.get(
  '/',
  createHandler(votesDataController, 'getBusinessVotes'),
  {
    validateQuery: votesListQuerySchema
  }
);

// Get pending votes
builder.get(
  '/pending',
  createHandler(votesDataController, 'getPendingVotes'),
  {
    validateQuery: pendingVotesQuerySchema
  }
);

// Get recent voting activity
builder.get(
  '/activity',
  createHandler(votesDataController, 'getRecentVotingActivity'),
  {
    validateQuery: activityQuerySchema
  }
);

// Get proposal pending stats
builder.get(
  '/proposal-stats',
  createHandler(votesDataController, 'getProposalPendingStats'),
  {
    validateQuery: proposalStatsParamsQuerySchema
  }
);

// Get vote contract address
builder.get(
  '/contract-address',
  createHandler(votesDataController, 'getVoteContractAddress'),
  {
    validateQuery: contractAddressQuerySchema
  }
);

// Get voting counts
builder.get(
  '/counts',
  createHandler(votesDataController, 'getVotingCounts'),
  {
    validateQuery: countsQuerySchema
  }
);

export default builder.getRouter();