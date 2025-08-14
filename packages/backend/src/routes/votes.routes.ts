// src/routes/votes.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as votesCtrl from '../controllers/votes.controller';
import {
  createProposalSchema,
  submitVoteSchema,
  batchSubmitVoteSchema,
  proposalParamsSchema,
  listProposalsQuerySchema,
  listVotesQuerySchema,
  voteParamsSchema,
  deployVotingContractSchema,
  updateProposalSchema
} from '../validation/votes.validation';

const router = Router();

// Apply dynamic rate limiting to all voting routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// ===== VOTING CONTRACT MANAGEMENT =====

// Deploy new voting contract for the brand (strict rate limiting)
router.post(
  '/deploy',
  strictRateLimiter(), // Prevent contract deployment spam
  validateBody(deployVotingContractSchema),
  votesCtrl.deployVotingContract
);

// Get voting contract details
router.get(
  '/contract',
  votesCtrl.getVotingContract
);

// Update voting contract settings
router.put(
  '/contract',
  strictRateLimiter(), // Security for contract updates
  validateBody(deployVotingContractSchema),
  votesCtrl.updateVotingContract
);

// ===== PROPOSAL MANAGEMENT =====

// Create new proposal (strict rate limiting to prevent spam)
router.post(
  '/proposals',
  strictRateLimiter(), // Prevent proposal spam
  validateBody(createProposalSchema),
  votesCtrl.createProposal
);

// List all proposals with filtering and pagination
router.get(
  '/proposals',
  validateQuery(listProposalsQuerySchema),
  votesCtrl.listProposals
);

// Get specific proposal details
router.get(
  '/proposals/:id',
  validateParams(proposalParamsSchema),
  votesCtrl.getProposal
);

// Update proposal (before voting starts)
router.put(
  '/proposals/:id',
  strictRateLimiter(), // Security for proposal updates
  validateParams(proposalParamsSchema),
  validateBody(updateProposalSchema),
  votesCtrl.updateProposal
);

// Delete proposal (admin only, before voting starts)
router.delete(
  '/proposals/:id',
  strictRateLimiter(), // Security for proposal deletion
  validateParams(proposalParamsSchema),
  votesCtrl.deleteProposal
);

// ===== PROPOSAL STATUS MANAGEMENT =====

// Start voting on proposal
router.post(
  '/proposals/:id/start',
  strictRateLimiter(), // Security for status changes
  validateParams(proposalParamsSchema),
  votesCtrl.startVoting
);

// End voting on proposal
router.post(
  '/proposals/:id/end',
  strictRateLimiter(), // Security for status changes
  validateParams(proposalParamsSchema),
  votesCtrl.endVoting
);

// Execute proposal (after voting ends)
router.post(
  '/proposals/:id/execute',
  strictRateLimiter(), // Security for execution
  validateParams(proposalParamsSchema),
  votesCtrl.executeProposal
);

// ===== VOTING OPERATIONS =====

// Submit single vote (strict rate limiting)
router.post(
  '/vote',
  strictRateLimiter(), // Prevent vote manipulation
  validateBody(submitVoteSchema),
  votesCtrl.submitVote
);

// Submit batch votes (extra strict rate limiting)
router.post(
  '/vote/batch',
  strictRateLimiter(), // Very strict for batch voting
  validateBody(batchSubmitVoteSchema),
  votesCtrl.submitBatchVotes
);

// ===== VOTE TRACKING =====

// List all votes with filtering
router.get(
  '/votes',
  validateQuery(listVotesQuerySchema),
  votesCtrl.listVotes
);

// Get specific vote details
router.get(
  '/votes/:id',
  validateParams(voteParamsSchema),
  votesCtrl.getVote
);

// Get user's voting history
router.get(
  '/my-votes',
  validateQuery(listVotesQuerySchema),
  votesCtrl.getMyVotes
);

// ===== PROPOSAL ANALYTICS =====

// Get proposal results and analytics
router.get(
  '/proposals/:id/results',
  validateParams(proposalParamsSchema),
  votesCtrl.getProposalResults
);

// Get voting statistics
router.get(
  '/proposals/:id/stats',
  validateParams(proposalParamsSchema),
  votesCtrl.getVotingStats
);

// Get voter demographics for proposal
router.get(
  '/proposals/:id/demographics',
  validateParams(proposalParamsSchema),
  votesCtrl.getVoterDemographics
);

// ===== VOTING ANALYTICS =====

// Get overall voting analytics
router.get(
  '/analytics',
  validateQuery(listProposalsQuerySchema),
  votesCtrl.getVotingAnalytics
);

// Get participation analytics
router.get(
  '/analytics/participation',
  validateQuery(listProposalsQuerySchema),
  votesCtrl.getParticipationAnalytics
);

// Get engagement metrics
router.get(
  '/analytics/engagement',
  validateQuery(listProposalsQuerySchema),
  votesCtrl.getEngagementMetrics
);

// ===== VERIFICATION & VALIDATION =====

// Verify vote authenticity
router.post(
  '/verify',
  validateBody(submitVoteSchema.extract(['signature', 'voteId'])),
  votesCtrl.verifyVote
);

// Validate voting eligibility
router.post(
  '/eligibility',
  validateBody(proposalParamsSchema),
  votesCtrl.checkVotingEligibility
);

// ===== VOTING GOVERNANCE =====

// Get voting rules and configuration
router.get(
  '/rules',
  votesCtrl.getVotingRules
);

// Update voting rules (admin only)
router.put(
  '/rules',
  strictRateLimiter(), // Security for rule changes
  validateBody(deployVotingContractSchema.extract(['votingRules'])),
  votesCtrl.updateVotingRules
);

// ===== DELEGATION & PROXY VOTING =====

// Delegate voting power
router.post(
  '/delegate',
  strictRateLimiter(), // Security for delegation
  validateBody(submitVoteSchema.extract(['delegateTo', 'signature'])),
  votesCtrl.delegateVotingPower
);

// Revoke delegation
router.delete(
  '/delegate',
  strictRateLimiter(), // Security for revocation
  votesCtrl.revokeDelegation
);

// Get delegation information
router.get(
  '/delegation',
  votesCtrl.getDelegationInfo
);

export default router;
