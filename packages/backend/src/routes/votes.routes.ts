
// src/routes/votes.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as votesCtrl from '../controllers/votes.controller';
import {
  createProposalSchema,
  submitVoteSchema,
  proposalParamsSchema,
  listProposalsQuerySchema,
  listVotesQuerySchema,
  deployVotingContractSchema,
  votingStatsQuerySchema
} from '../validation/votes.validation';

const router = Router();

// Apply dynamic rate limiting to all voting routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply authentication to all routes
router.use(authenticate);

// ===== VOTING CONTRACT MANAGEMENT =====

/**
 * POST /api/votes/deploy
 * Deploy new voting contract for the business
 * 
 * @requires authentication & tenant context
 * @requires validation: contract deployment parameters
 * @returns { contract, deployment, blockchain }
 */
router.post(
  '/deploy',
  asRateLimitHandler(strictRateLimiter()), // Prevent contract deployment spam
  validateBody(deployVotingContractSchema),
  ((asRouteHandler(votesCtrl.deployVotingContract))
));

// ===== PROPOSAL MANAGEMENT =====

/**
 * POST /api/votes/proposals
 * Create new proposal for voting
 * 
 * @requires authentication & tenant context
 * @requires validation: proposal creation data
 * @returns { proposal, blockchain, metadata }
 */
router.post(
  '/proposals',
  asRateLimitHandler(strictRateLimiter()), // Prevent proposal spam
  validateBody(createProposalSchema),
  ((asRouteHandler(votesCtrl.createProposal))
));

/**
 * GET /api/votes/proposals
 * List all proposals for the business
 * 
 * @requires authentication & tenant context
 * @optional query: filtering and pagination
 * @returns { proposals[], stats, pagination }
 */
router.get(
  '/proposals',
  validateQuery(listProposalsQuerySchema),
  ((asRouteHandler(votesCtrl.listProposals))
));

/**
 * GET /api/votes/proposals/:proposalId
 * Get proposal details by ID
 * 
 * @requires authentication & tenant context
 * @requires params: { proposalId: string }
 * @returns { proposal, votes, analytics }
 */
router.get(
  '/proposals/:proposalId',
  validateParams(proposalParamsSchema),
  ((asRouteHandler(votesCtrl.getProposalDetails))
));

// ===== PROPOSAL ANALYTICS =====

/**
 * GET /api/votes/proposals/:proposalId/results
 * Get proposal voting results with detailed breakdown
 * 
 * @requires authentication & tenant context
 * @requires params: { proposalId: string }
 * @returns { proposal, results, breakdown, participation }
 */
router.get(
  '/proposals/:proposalId/results',
  validateParams(proposalParamsSchema),
  ((asRouteHandler(votesCtrl.getProposalResults))
));

// ===== VOTING OPERATIONS =====

/**
 * POST /api/votes
 * Submit votes for proposals (with batching logic)
 * 
 * @requires authentication & tenant context
 * @requires validation: voting data
 * @returns { votes, batch, pending }
 */
router.post(
  '/',
  asRateLimitHandler(strictRateLimiter()), // Prevent vote manipulation
  validateBody(submitVoteSchema),
  ((asRouteHandler(votesCtrl.submitVote))
));

/**
 * GET /api/votes
 * List all votes for the business
 * 
 * @requires authentication & tenant context
 * @optional query: filtering options
 * @returns { votes[], pending[], stats }
 */
router.get(
  '/',
  validateQuery(listVotesQuerySchema),
  ((asRouteHandler(votesCtrl.listVotes))
));

/**
 * GET /api/votes/my-votes
 * Get user's personal voting history
 * 
 * @requires authentication & tenant context
 * @optional query: filtering and pagination
 * @returns { votes[], stats, activity }
 */
router.get(
  '/my-votes',
  validateQuery(listVotesQuerySchema),
  ((asRouteHandler(votesCtrl.getMyVotes))
));

// ===== VOTING ANALYTICS =====

/**
 * GET /api/votes/stats
 * Get voting statistics and analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range and filters
 * @returns { stats, analytics, trends }
 */
router.get(
  '/stats',
  validateQuery(votingStatsQuerySchema),
  ((asRouteHandler(votesCtrl.getVotingStats))
));

/**
 * GET /api/votes/analytics
 * Get overall voting analytics across all proposals
 * 
 * @requires authentication & tenant context
 * @optional query: date range filters
 * @returns { overview, trends, topProposals, engagement }
 */
router.get(
  '/analytics',
  validateQuery(votingStatsQuerySchema),
  ((asRouteHandler(votesCtrl.getVotingAnalytics))
));

// ===== ADMIN OPERATIONS =====

/**
 * POST /api/votes/force-submit
 * Force submit pending votes (admin action)
 * 
 * @requires authentication & tenant context
 * @returns { batch, submission, blockchain }
 */
router.post(
  '/force-submit',
  asRateLimitHandler(strictRateLimiter()), // Security for forced submissions
  ((asRouteHandler(votesCtrl.forceSubmitPendingVotes))
));

export default router;
