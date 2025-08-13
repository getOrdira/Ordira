// src/routes/voting/proposals/proposal-id/results/route.ts
import { Router } from 'express';
import { validateQuery, validateParams } from '../../../../../middleware/validation.middleware';
import { authenticate } from '../../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../../../../middleware/metrics.middleware';
import * as proposalResultsCtrl from '../../../../../controllers/voting/proposals/results.controller';
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
 * GET /api/voting/proposals/:proposalId/results
 * Get comprehensive voting results
 */
router.get(
  '/',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_proposal_results'),
  proposalResultsCtrl.getProposalResults
);

/**
 * GET /api/voting/proposals/:proposalId/results/summary
 * Get results summary with key metrics
 */
router.get(
  '/summary',
  trackManufacturerAction('view_results_summary'),
  proposalResultsCtrl.getResultsSummary
);

/**
 * GET /api/voting/proposals/:proposalId/results/breakdown
 * Get detailed vote breakdown by demographics
 */
router.get(
  '/breakdown',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_results_breakdown'),
  proposalResultsCtrl.getResultsBreakdown
);

/**
 * GET /api/voting/proposals/:proposalId/results/trends
 * Get voting trends over time
 */
router.get(
  '/trends',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_voting_trends'),
  proposalResultsCtrl.getVotingTrends
);

/**
 * GET /api/voting/proposals/:proposalId/results/analytics
 * Get advanced analytics and insights
 */
router.get(
  '/analytics',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_results_analytics'),
  proposalResultsCtrl.getResultsAnalytics
);

/**
 * GET /api/voting/proposals/:proposalId/results/comparison
 * Compare results with similar proposals
 */
router.get(
  '/comparison',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_results_comparison'),
  proposalResultsCtrl.getResultsComparison
);

/**
 * GET /api/voting/proposals/:proposalId/results/geographical
 * Get geographical voting distribution
 */
router.get(
  '/geographical',
  requireTenantPlan(['enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_geographical_results'),
  proposalResultsCtrl.getGeographicalResults
);

/**
 * GET /api/voting/proposals/:proposalId/results/real-time
 * Get real-time voting results
 */
router.get(
  '/real-time',
  trackManufacturerAction('view_realtime_results'),
  proposalResultsCtrl.getRealTimeResults
);

/**
 * GET /api/voting/proposals/:proposalId/results/final
 * Get final certified results
 */
router.get(
  '/final',
  trackManufacturerAction('view_final_results'),
  proposalResultsCtrl.getFinalResults
);

/**
 * GET /api/voting/proposals/:proposalId/results/blockchain-verification
 * Verify results on blockchain
 */
router.get(
  '/blockchain-verification',
  requireTenantPlan(['premium', 'enterprise']),
  trackManufacturerAction('verify_blockchain_results'),
  proposalResultsCtrl.verifyBlockchainResults
);

/**
 * GET /api/voting/proposals/:proposalId/results/export
 * Export voting results
 */
router.get(
  '/export',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('export_voting_results'),
  proposalResultsCtrl.exportVotingResults
);

/**
 * GET /api/voting/proposals/:proposalId/results/participation-rate
 * Get detailed participation rate analysis
 */
router.get(
  '/participation-rate',
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_participation_rate'),
  proposalResultsCtrl.getParticipationRate
);

/**
 * GET /api/voting/proposals/:proposalId/results/winner
 * Get winning option and margin
 */
router.get(
  '/winner',
  trackManufacturerAction('view_proposal_winner'),
  proposalResultsCtrl.getProposalWinner
);

/**
 * GET /api/voting/proposals/:proposalId/results/confidence
 * Get statistical confidence analysis
 */
router.get(
  '/confidence',
  requireTenantPlan(['enterprise']),
  validateQuery(votesValidationSchemas.voteAnalytics),
  trackManufacturerAction('view_confidence_analysis'),
  proposalResultsCtrl.getConfidenceAnalysis
);

export default router;