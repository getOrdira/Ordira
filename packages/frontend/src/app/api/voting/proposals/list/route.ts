// src/routes/voting/proposals/list/route.ts
import { Router } from 'express';
import { validateQuery } from '../../../../middleware/validation.middleware';
import { authenticate } from '../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../../../middleware/metrics.middleware';
import * as proposalListCtrl from '../../../../controllers/voting/proposals/list.controller';
import { votesValidationSchemas } from '../../../../validation/votes.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['growth', 'premium', 'enterprise']));
router.use(cleanupOnError);

/**
 * GET /api/voting/proposals/list
 * List all proposals with filtering and pagination
 */
router.get(
  '/',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('list_proposals'),
  proposalListCtrl.listProposals
);

/**
 * GET /api/voting/proposals/list/active
 * List active proposals
 */
router.get(
  '/active',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('list_active_proposals'),
  proposalListCtrl.listActiveProposals
);

/**
 * GET /api/voting/proposals/list/completed
 * List completed proposals
 */
router.get(
  '/completed',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('list_completed_proposals'),
  proposalListCtrl.listCompletedProposals
);

/**
 * GET /api/voting/proposals/list/drafts
 * List draft proposals
 */
router.get(
  '/drafts',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('list_draft_proposals'),
  proposalListCtrl.listDraftProposals
);

/**
 * GET /api/voting/proposals/list/scheduled
 * List scheduled proposals
 */
router.get(
  '/scheduled',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('list_scheduled_proposals'),
  proposalListCtrl.listScheduledProposals
);

/**
 * GET /api/voting/proposals/list/trending
 * Get trending proposals (most votes/engagement)
 */
router.get(
  '/trending',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('view_trending_proposals'),
  proposalListCtrl.getTrendingProposals
);

/**
 * GET /api/voting/proposals/list/category/:category
 * List proposals by category
 */
router.get(
  '/category/:category',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('list_proposals_by_category'),
  proposalListCtrl.listProposalsByCategory
);

/**
 * GET /api/voting/proposals/list/search
 * Search proposals
 */
router.get(
  '/search',
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('search_proposals'),
  proposalListCtrl.searchProposals
);

/**
 * GET /api/voting/proposals/list/stats
 * Get proposal statistics
 */
router.get(
  '/stats',
  trackManufacturerAction('view_proposal_stats'),
  proposalListCtrl.getProposalStats
);

/**
 * GET /api/voting/proposals/list/export
 * Export proposals data
 */
router.get(
  '/export',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(votesValidationSchemas.listProposalsQuery),
  trackManufacturerAction('export_proposals'),
  proposalListCtrl.exportProposals
);

export default router;