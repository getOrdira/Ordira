// src/routes/voting/governance/analytics/route.ts
import { Router } from 'express';
import { validateQuery } from '../../../../middleware/validation.middleware';
import { authenticate } from '../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../../../middleware/metrics.middleware';
import * as votingAnalyticsCtrl from '../../../../controllers/voting/analytics.controller';
import { voteAnalyticsSchema, votesValidationSchemas } from '../../../../validation/votes.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['growth', 'premium', 'enterprise']));
router.use(cleanupOnError);

/**
 * GET /api/voting/governance/analytics
 * Get comprehensive voting analytics
 */
router.get(
  '/',
  validateQuery(voteAnalyticsSchema),
  trackManufacturerAction('view_voting_analytics'),
  votingAnalyticsCtrl.getVotingAnalytics
);

/**
 * GET /api/voting/governance/analytics/overview
 * Get voting analytics overview dashboard
 */
router.get(
  '/overview',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_voting_overview'),
  votingAnalyticsCtrl.getVotingOverview
);

/**
 * GET /api/voting/governance/analytics/participation
 * Get voter participation analytics
 */
router.get(
  '/participation',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_participation_analytics'),
  votingAnalyticsCtrl.getParticipationAnalytics
);

/**
 * GET /api/voting/governance/analytics/proposals
 * Get proposal performance analytics
 */
router.get(
  '/proposals',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_analytics'),
  votingAnalyticsCtrl.getProposalAnalytics
);

/**
 * GET /api/voting/governance/analytics/engagement
 * Get voter engagement trends
 */
router.get(
  '/engagement',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_engagement_analytics'),
  votingAnalyticsCtrl.getEngagementAnalytics
);

/**
 * GET /api/voting/governance/analytics/demographics
 * Get voter demographics analytics
 */
router.get(
  '/demographics',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_voter_demographics'),
  votingAnalyticsCtrl.getVoterDemographics
);

/**
 * GET /api/voting/governance/analytics/timeline
 * Get voting activity timeline
 */
router.get(
  '/timeline',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_voting_timeline'),
  votingAnalyticsCtrl.getVotingTimeline
);

/**
 * GET /api/voting/governance/analytics/blockchain
 * Get blockchain voting analytics
 */
router.get(
  '/blockchain',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_blockchain_analytics'),
  votingAnalyticsCtrl.getBlockchainAnalytics
);

/**
 * GET /api/voting/governance/analytics/export
 * Export voting analytics data
 */
router.get(
  '/export',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('export_voting_analytics'),
  votingAnalyticsCtrl.exportVotingAnalytics
);

export default router;