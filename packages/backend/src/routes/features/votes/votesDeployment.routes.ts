// src/routes/features/votes/votesDeployment.routes.ts
// Vote deployment routes using modular vote deployment controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesDeploymentController } from '../../../controllers/features/votes/votesDeployment.controller';

const objectIdSchema = Joi.string().hex().length(24);

const deployContractBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  votingDelay: Joi.number().integer().min(0).optional(),
  votingPeriod: Joi.number().integer().min(1).optional(),
  quorumPercentage: Joi.number().integer().min(0).max(100).optional()
});

const getContractAddressQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const verifyContractQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const getContractDeploymentInfoQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const updateContractSettingsBodySchema = Joi.object({
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  votingDelay: Joi.number().integer().min(0).optional(),
  votingPeriod: Joi.number().integer().min(1).optional(),
  quorumPercentage: Joi.number().integer().min(0).max(100).optional()
});

const updateContractSettingsQuerySchema = Joi.object({
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Deploy voting contract
builder.post(
  '/deploy',
  createHandler(votesDeploymentController, 'deployVotingContract'),
  {
    validateBody: deployContractBodySchema
  }
);

// Get voting contract address
builder.get(
  '/contract-address',
  createHandler(votesDeploymentController, 'getVotingContractAddress'),
  {
    validateQuery: getContractAddressQuerySchema
  }
);

// Verify voting contract
builder.get(
  '/verify',
  createHandler(votesDeploymentController, 'verifyVotingContract'),
  {
    validateQuery: verifyContractQuerySchema
  }
);

// Get contract deployment info
builder.get(
  '/deployment-info',
  createHandler(votesDeploymentController, 'getContractDeploymentInfo'),
  {
    validateQuery: getContractDeploymentInfoQuerySchema
  }
);

// Update contract settings
builder.put(
  '/settings',
  createHandler(votesDeploymentController, 'updateContractSettings'),
  {
    validateBody: updateContractSettingsBodySchema,
    validateQuery: updateContractSettingsQuerySchema
  }
);

export default builder.getRouter();