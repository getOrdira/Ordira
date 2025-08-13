// src/routes/voting/governance/settings/route.ts
import { Router } from 'express';
import { validateBody } from '../../../../middleware/validation.middleware';
import { authenticate } from '../../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../../../middleware/metrics.middleware';
import * as votingSettingsCtrl from '../../../../controllers/voting/settings.controller';
import { votesValidationSchemas } from '../../../../validation/votes.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantPlan(['growth', 'premium', 'enterprise']));
router.use(cleanupOnError);

/**
 * GET /api/voting/governance/settings
 * Get voting governance settings
 */
router.get(
  '/',
  trackManufacturerAction('view_voting_settings'),
  votingSettingsCtrl.getVotingSettings
);

/**
 * PUT /api/voting/governance/settings
 * Update voting governance settings
 */
router.put(
  '/',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.updateVotingRules),
  trackManufacturerAction('update_voting_settings'),
  votingSettingsCtrl.updateVotingSettings
);

/**
 * GET /api/voting/governance/settings/contract
 * Get smart contract settings
 */
router.get(
  '/contract',
  trackManufacturerAction('view_contract_settings'),
  votingSettingsCtrl.getContractSettings
);

/**
 * POST /api/voting/governance/settings/contract/deploy
 * Deploy new voting contract
 */
router.post(
  '/contract/deploy',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(votesValidationSchemas.createProposal),
  trackManufacturerAction('deploy_voting_contract'),
  votingSettingsCtrl.deployVotingContract
);

/**
 * PUT /api/voting/governance/settings/voting-rules
 * Update voting rules (quorum, period, etc.)
 */
router.put(
  '/voting-rules',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.updateVotingRules),
  trackManufacturerAction('update_voting_rules'),
  votingSettingsCtrl.updateVotingRules
);

/**
 * GET /api/voting/governance/settings/permissions
 * Get voting permissions
 */
router.get(
  '/permissions',
  trackManufacturerAction('view_voting_permissions'),
  votingSettingsCtrl.getVotingPermissions
);

/**
 * PUT /api/voting/governance/settings/permissions
 * Update voting permissions
 */
router.put(
  '/permissions',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.updateVotingRules),
  trackManufacturerAction('update_voting_permissions'),
  votingSettingsCtrl.updateVotingPermissions
);

/**
 * GET /api/voting/governance/settings/notifications
 * Get voting notification settings
 */
router.get(
  '/notifications',
  trackManufacturerAction('view_voting_notifications'),
  votingSettingsCtrl.getNotificationSettings
);

/**
 * PUT /api/voting/governance/settings/notifications
 * Update voting notification settings
 */
router.put(
  '/notifications',
  validateBody(votesValidationSchemas.updateVotingRules),
  trackManufacturerAction('update_voting_notifications'),
  votingSettingsCtrl.updateNotificationSettings
);

/**
 * POST /api/voting/governance/settings/reset
 * Reset settings to default
 */
router.post(
  '/reset',
  strictRateLimiter(),
  validateBody(votesValidationSchemas.updateVotingRules),
  trackManufacturerAction('reset_voting_settings'),
  votingSettingsCtrl.resetVotingSettings
);

export default router;