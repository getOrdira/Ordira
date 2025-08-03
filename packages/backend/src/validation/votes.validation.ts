// src/validation/votes.validation.ts
import Joi from 'joi';

/**
 * Schema for creating a new proposal
 */
export const createProposalSchema = Joi.object({
  description: Joi.string().required()
});

/**
 * Schema for casting a vote
 */
export const submitVoteSchema = Joi.object({
  proposalId: Joi.string().required()
});

export const batchVoteSchema = Joi.object({
    votes: Joi.array().items(
      Joi.object({
        proposalId:    Joi.string().required(),
        walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
        signature:     Joi.string().required()
      })
    ).min(1).required()
  });