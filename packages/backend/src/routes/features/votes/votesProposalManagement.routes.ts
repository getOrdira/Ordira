// src/routes/features/votes/votesProposalManagement.routes.ts
// Vote proposal management routes using modular vote proposal management controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesProposalManagementController } from '../../../controllers/features/votes/votesProposalManagement.controller';
import { enforcePlanLimits } from '../../../middleware/limits/planLimits.middleware';

const objectIdSchema = Joi.string().hex().length(24);

const createProposalBodySchema = Joi.object({
  title: Joi.string().trim().min(1).max(500).required(),
  description: Joi.string().trim().max(10000).required(),
  category: Joi.string().trim().max(200).optional(),
  imageUrl: Joi.string().uri().max(1000).optional(),
  mediaIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(200)),
    Joi.string()
  ).optional(),
  productIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(200)),
    Joi.string()
  ).required(),
  allowMultipleSelections: Joi.boolean().optional(),
  maxSelections: Joi.number().integer().min(1).max(50).optional(),
  requireReason: Joi.boolean().optional(),
  duration: Joi.number().integer().min(60).optional(),
  startTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
  endTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(100)),
    Joi.string()
  ).optional(),
  deployToBlockchain: Joi.boolean().optional()
});

const updateProposalBodySchema = Joi.object({
  title: Joi.string().trim().min(1).max(500).optional(),
  description: Joi.string().trim().max(10000).optional(),
  category: Joi.string().trim().max(200).optional(),
  imageUrl: Joi.string().uri().max(1000).optional(),
  duration: Joi.number().integer().min(60).optional(),
  endTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(100)),
    Joi.string()
  ).optional()
}).min(1);

const proposalIdParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  proposalId: Joi.string().trim().max(200).required()
});

const listProposalsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  status: Joi.string().valid('draft', 'active', 'completed', 'failed', 'pending', 'succeeded', 'cancelled', 'deactivated').optional(),
  category: Joi.string().trim().max(200).optional(),
  limit: Joi.number().integer().min(1).max(500).optional(),
  offset: Joi.number().integer().min(0).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create proposal - enforces vote/proposal limits based on plan
builder.post(
  '/',
  createHandler(votesProposalManagementController, 'createProposal'),
  {
    validateBody: createProposalBodySchema,
    middleware: [enforcePlanLimits('votes')]
  }
);

// Update proposal
builder.put(
  '/:proposalId',
  createHandler(votesProposalManagementController, 'updateProposal'),
  {
    validateParams: proposalIdParamsSchema,
    validateBody: updateProposalBodySchema
  }
);

// Activate proposal
builder.post(
  '/:proposalId/activate',
  createHandler(votesProposalManagementController, 'activateProposal'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// Deactivate proposal
builder.post(
  '/:proposalId/deactivate',
  createHandler(votesProposalManagementController, 'deactivateProposal'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// Complete proposal
builder.post(
  '/:proposalId/complete',
  createHandler(votesProposalManagementController, 'completeProposal'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// Cancel proposal
builder.post(
  '/:proposalId/cancel',
  createHandler(votesProposalManagementController, 'cancelProposal'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// Deploy proposal to blockchain
builder.post(
  '/:proposalId/deploy',
  createHandler(votesProposalManagementController, 'deployProposalToBlockchain'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// Get proposal
builder.get(
  '/:proposalId',
  createHandler(votesProposalManagementController, 'getProposal'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// Get proposal statistics
builder.get(
  '/:proposalId/statistics',
  createHandler(votesProposalManagementController, 'getProposalStatistics'),
  {
    validateParams: proposalIdParamsSchema
  }
);

// List proposals
builder.get(
  '/',
  createHandler(votesProposalManagementController, 'listProposals'),
  {
    validateQuery: listProposalsQuerySchema
  }
);

// Delete proposal
builder.delete(
  '/:proposalId',
  createHandler(votesProposalManagementController, 'deleteProposal'),
  {
    validateParams: proposalIdParamsSchema
  }
);

export default builder.getRouter();