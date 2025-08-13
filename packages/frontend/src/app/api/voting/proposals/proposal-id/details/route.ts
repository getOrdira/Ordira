// src/routes/voting/proposals/proposal-id/details/route.ts
import { Router } from 'express';
import { validateQuery, validateParams } from '../../../../../middleware/validation.middleware';
import { authenticate } from '../../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../../../../middleware/metrics.middleware';
import * as proposalDetailsCtrl from '../../../../../controllers/voting/proposals/details.controller';
import { votesValidationSchemas } from '../../../../../validation/votes.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['growth', 'premium', 'enterprise']));
router.use(validateParams(votesValidationSchemas.proposalParams));
router.use(cleanupOnError);

/**
 * GET /api/voting/proposals/:proposalId/details
 * Get comprehensive proposal details
 */
router.get(
  '/',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_details'),
  proposalDetailsCtrl.getProposalDetails
);

/**
 * GET /api/voting/proposals/:proposalId/details/metadata
 * Get proposal metadata and configuration
 */
router.get(
  '/metadata',
  trackManufacturerAction('view_proposal_metadata'),
  proposalDetailsCtrl.getProposalMetadata
);

/**
 * GET /api/voting/proposals/:proposalId/details/timeline
 * Get proposal activity timeline
 */
router.get(
  '/timeline',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_timeline'),
  proposalDetailsCtrl.getProposalTimeline
);

/**
 * GET /api/voting/proposals/:proposalId/details/participation
 * Get detailed participation metrics
 */
router.get(
  '/participation',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_participation'),
  proposalDetailsCtrl.getProposalParticipation
);

/**
 * GET /api/voting/proposals/:proposalId/details/blockchain
 * Get blockchain-specific details
 */
router.get(
  '/blockchain',
  trackManufacturerAction('view_proposal_blockchain_details'),
  proposalDetailsCtrl.getProposalBlockchainDetails
);

/**
 * GET /api/voting/proposals/:proposalId/details/voters
 * Get detailed voter information
 */
router.get(
  '/voters',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.listVotesQuery),
  trackManufacturerAction('view_proposal_voters'),
  proposalDetailsCtrl.getProposalVoters
);

/**
 * GET /api/voting/proposals/:proposalId/details/engagement
 * Get voter engagement metrics
 */
router.get(
  '/engagement',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_engagement'),
  proposalDetailsCtrl.getProposalEngagement
);

/**
 * GET /api/voting/proposals/:proposalId/details/distribution
 * Get vote distribution analysis
 */
router.get(
  '/distribution',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_vote_distribution'),
  proposalDetailsCtrl.getVoteDistribution
);

/**
 * GET /api/voting/proposals/:proposalId/details/comments
 * Get proposal comments and feedback
 */
router.get(
  '/comments',
  validateQuery(votesValidationSchemas.listVotesQuery),
  trackManufacturerAction('view_proposal_comments'),
  proposalDetailsCtrl.getProposalComments
);

/**
 * GET /api/voting/proposals/:proposalId/details/attachments
 * Get proposal attachments and media
 */
router.get(
  '/attachments',
  trackManufacturerAction('view_proposal_attachments'),
  proposalDetailsCtrl.getProposalAttachments
);

/**
 * GET /api/voting/proposals/:proposalId/details/audit
 * Get detailed audit trail
 */
router.get(
  '/audit',
  requireTenantPlan(['enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_audit_details'),
  proposalDetailsCtrl.getProposalAuditDetails
);

/**
 * GET /api/voting/proposals/:proposalId/details/status
 * Get real-time proposal status
 */
router.get(
  '/status',
  trackManufacturerAction('view_proposal_status'),
  proposalDetailsCtrl.getProposalStatus
);

/**
 * GET /api/voting/proposals/:proposalId/details/similar
 * Get similar proposals for comparison
 */
router.get(
  '/similar',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('view_similar_proposals'),
  proposalDetailsCtrl.getSimilarProposals
);

export default router;