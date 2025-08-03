// src/routes/votes.routes.ts

import { Router } from 'express';
import * as votesCtrl from '../controllers/votes.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  submitVoteSchema,
  createProposalSchema
} from '../validation/votes.validation';
import Joi from 'joi';
import { authenticate } from '../middleware/auth.middleware'; 

const votesRouter = Router();

const batchSchema = Joi.object({
  votes: Joi.array()
    .items(
      Joi.object({
        proposalId: Joi.string().required(),
        voteId:     Joi.string().required(),
        signature:  Joi.string().required()
      })
    )
    .min(1)
    .required()
});

// Deploy a new Voting contract for the brand
votesRouter.post(
  '/deploy',
  votesCtrl.deployVotingContract
);

// Create a new proposal on-chain
votesRouter.post(
  '/proposals',
  validateBody(createProposalSchema),
  votesCtrl.createProposal
);

// List all proposals for the brand
votesRouter.get(
  '/proposals',
  votesCtrl.listProposals
);

// Cast a vote on-chain
votesRouter.post(
  '/',
  validateBody(submitVoteSchema),
  votesCtrl.submitVote
);

// List all votes cast for the brand
votesRouter.get(
  '/',
  votesCtrl.listVotes
);

votesRouter.post(
  '/batch',
  authenticate,
  validateBody(batchSchema),
  votesCtrl.submitVote
);

export default votesRouter;
