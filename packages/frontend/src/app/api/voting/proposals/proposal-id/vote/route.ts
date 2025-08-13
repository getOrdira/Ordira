// src/routes/voting/proposals/proposal-id/vote/route.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../../../../middleware/validation.middleware';
import { authenticate } from '../../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../../../middleware/upload.middleware';
import { trackUserAction } from '../../../../../middleware/metrics.middleware';
import * as proposalVoteCtrl from '../../../../../controllers/voting/proposals/vote.controller';
import { votesValidationSchemas } from '../../../../../validation/votes.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate); // Users (clients) must be authenticated to vote
router.use(resolveTenant);
router.use(validateParams(votesValidationSchemas.proposalParams));
router.use(cleanupOnError);

/**
 * POST /api/voting/proposals/:proposalId/vote
 * Submit vote for proposal (main voting endpoint for users)
 */
router.post(
  '/',
  strictRateLimiter(), // Prevent vote spam
  validateBody(votesValidationSchemas.submitVote),
  trackUserAction('submit_vote'),
  proposalVoteCtrl.submitVote
);

/**
 * GET /api/voting/proposals/:proposalId/vote/status
 * Check user's voting status for this proposal
 */
router.get(
  '/status',
  trackUserAction('check_vote_status'),
  proposalVoteCtrl.checkVoteStatus
);

/**
 * GET /api/voting/proposals/:proposalId/vote/eligibility
 * Check if user is eligible to vote
 */
router.get(
  '/eligibility',
  trackUserAction('check_vote_eligibility'),
  proposalVoteCtrl.checkVoteEligibility
);

/**
 * POST /api/voting/proposals/:proposalId/vote/validate
 * Validate vote before submission
 */
router.post(
  '/validate',
  validateBody(votesValidationSchemas.submitVote),
  trackUserAction('validate_vote'),
  proposalVoteCtrl.validateVote
);

/**
 * GET /api/voting/proposals/:proposalId/vote/options
 * Get available voting options for proposal
 */
router.get(
  '/options',
  trackUserAction('view_vote_options'),
  proposalVoteCtrl.getVoteOptions
);

/**
 * POST /api/voting/proposals/:proposalId/vote/preview
 * Preview vote before final submission
 */
router.post(
  '/preview',
  validateBody(votesValidationSchemas.submitVote),
  trackUserAction('preview_vote'),
  proposalVoteCtrl.previewVote
);

/**
 * GET /api/voting/proposals/:proposalId/vote/history
 * Get user's voting history for this proposal (if allowed)
 */
router.get(
  '/history',
  validateQuery(votesValidationSchemas.listVotesQuery),
  trackUserAction('view_vote_history'),
  proposalVoteCtrl.getUserVoteHistory
);

/**
 * POST /api/voting/proposals/:proposalId/vote/change
 * Change vote if voting rules allow (rare feature)
 */
router.post(
  '/change',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.submitVote),
  trackUserAction('change_vote'),
  proposalVoteCtrl.changeVote
);

/**
 * DELETE /api/voting/proposals/:proposalId/vote
 * Withdraw vote if voting rules allow
 */
router.delete(
  '/',
  strictRateLimiter(),
  trackUserAction('withdraw_vote'),
  proposalVoteCtrl.withdrawVote
);

/**
 * POST /api/voting/proposals/:proposalId/vote/delegate
 * Delegate vote to another user
 */
router.post(
  '/delegate',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(votesValidationSchemas.delegateVote),
  trackUserAction('delegate_vote'),
  proposalVoteCtrl.delegateVote
);

/**
 * GET /api/voting/proposals/:proposalId/vote/delegation
 * Get delegation status and details
 */
router.get(
  '/delegation',
  requireTenantPlan(['premium', 'enterprise']),
  trackUserAction('view_delegation_status'),
  proposalVoteCtrl.getDelegationStatus
);

/**
 * DELETE /api/voting/proposals/:proposalId/vote/delegation
 * Revoke vote delegation
 */
router.delete(
  '/delegation',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  trackUserAction('revoke_delegation'),
  proposalVoteCtrl.revokeDelegation
);

/**
 * POST /api/voting/proposals/:proposalId/vote/batch
 * Submit multiple votes in batch (for proxy voting)
 */
router.post(
  '/batch',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(votesValidationSchemas.batchSubmitVote),
  trackUserAction('submit_batch_vote'),
  proposalVoteCtrl.submitBatchVote
);

/**
 * GET /api/voting/proposals/:proposalId/vote/receipt
 * Get voting receipt/proof
 */
router.get(
  '/receipt',
  trackUserAction('view_vote_receipt'),
  proposalVoteCtrl.getVoteReceipt
);

/**
 * POST /api/voting/proposals/:proposalId/vote/verify
 * Verify vote on blockchain
 */
router.post(
  '/verify',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(votesValidationSchemas.verifyVote),
  trackUserAction('verify_vote'),
  proposalVoteCtrl.verifyVoteOnBlockchain
);

/**
 * GET /api/voting/proposals/:proposalId/vote/gas-estimate
 * Get gas estimate for voting transaction
 */
router.get(
  '/gas-estimate',
  trackUserAction('view_gas_estimate'),
  proposalVoteCtrl.getVoteGasEstimate
);

/**
 * POST /api/voting/proposals/:proposalId/vote/sign
 * Sign vote message for meta-transaction
 */
router.post(
  '/sign',
  validateBody(votesValidationSchemas.submitVote),
  trackUserAction('sign_vote'),
  proposalVoteCtrl.signVoteMessage
);

/**
 * GET /api/voting/proposals/:proposalId/vote/requirements
 * Get voting requirements and rules
 */
router.get(
  '/requirements',
  trackUserAction('view_vote_requirements'),
  proposalVoteCtrl.getVoteRequirements
);

export default router;