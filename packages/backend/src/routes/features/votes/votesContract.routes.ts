// src/routes/features/votes/votesContract.routes.ts
// Vote contract routes using modular vote contract controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { votesContractController } from '../../../controllers/features/votes/votesContract.controller';

const contractInfoQuerySchema = Joi.object({
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const contractInfoParamsSchema = Joi.object({
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get contract info
builder.get(
  '/info',
  createHandler(votesContractController, 'getContractInfo'),
  {
    validateQuery: contractInfoQuerySchema
  }
);

// Get contract info by param
builder.get(
  '/:contractAddress/info',
  createHandler(votesContractController, 'getContractInfo'),
  {
    validateParams: contractInfoParamsSchema
  }
);

// Get proposal events
builder.get(
  '/proposal-events',
  createHandler(votesContractController, 'getProposalEvents'),
  {
    validateQuery: contractInfoQuerySchema
  }
);

// Get proposal events by param
builder.get(
  '/:contractAddress/events/proposals',
  createHandler(votesContractController, 'getProposalEvents'),
  {
    validateParams: contractInfoParamsSchema
  }
);

// Get vote events
builder.get(
  '/vote-events',
  createHandler(votesContractController, 'getVoteEvents'),
  {
    validateQuery: contractInfoQuerySchema
  }
);

// Get vote events by param
builder.get(
  '/:contractAddress/events/votes',
  createHandler(votesContractController, 'getVoteEvents'),
  {
    validateParams: contractInfoParamsSchema
  }
);

export default builder.getRouter();