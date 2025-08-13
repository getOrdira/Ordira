// src/routes/voting/proposals/create/route.ts
import { Router } from 'express';
import { validateBody } from '../../../../middleware/validation.middleware';
import { authenticate } from '../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError } from '../../../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../../../middleware/metrics.middleware';
import * as proposalCreateCtrl from '../../../../controllers/voting/proposals/create.controller';
import { votesValidationSchemas } from '../../../../validation/votes.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['growth', 'premium', 'enterprise']));
router.use(cleanupOnError);

/**
 * POST /api/voting/proposals/create
 * Create new voting proposal
 */
router.post(
  '/',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('create_voting_proposal'),
  proposalCreateCtrl.createProposal
);

/**
 * POST /api/voting/proposals/create/with-media
 * Create proposal with media attachments
 */
router.post(
  '/with-media',
  strictRateLimiter(),
  uploadMiddleware.array('attachments', 5),
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('create_proposal_with_media'),
  proposalCreateCtrl.createProposalWithMedia
);

/**
 * POST /api/voting/proposals/create/from-template
 * Create proposal from template
 */
router.post(
  '/from-template',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('create_proposal_from_template'),
  proposalCreateCtrl.createProposalFromTemplate
);

/**
 * POST /api/voting/proposals/create/draft
 * Save proposal as draft
 */
router.post(
  '/draft',
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('save_proposal_draft'),
  proposalCreateCtrl.saveProposalDraft
);

/**
 * POST /api/voting/proposals/create/validate
 * Validate proposal before creation
 */
router.post(
  '/validate',
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('validate_proposal_creation'),
  proposalCreateCtrl.validateProposalCreation
);

/**
 * GET /api/voting/proposals/create/templates
 * Get available proposal templates
 */
router.get(
  '/templates',
  trackManufacturerAction('view_proposal_templates'),
  proposalCreateCtrl.getProposalTemplates
);

/**
 * POST /api/voting/proposals/create/schedule
 * Schedule proposal for later creation
 */
router.post(
  '/schedule',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('schedule_proposal'),
  proposalCreateCtrl.scheduleProposal
);

export default router;