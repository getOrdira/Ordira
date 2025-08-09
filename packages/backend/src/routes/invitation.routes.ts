// src/routes/invitation.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as invCtrl from '../controllers/invitation.controller';
import {
  sendInviteSchema,
  respondToInviteSchema,
  inviteParamsSchema,
  listInvitesQuerySchema,
  bulkInviteSchema
} from '../validation/invitation.validation';

const router = Router();

// Apply dynamic rate limiting to all invitation routes
router.use(dynamicRateLimiter());

// ===== BRAND INVITATION ROUTES =====

// Send invitation to manufacturer (strict rate limiting to prevent spam)
router.post(
  '/brand',
  strictRateLimiter(), // Prevent invitation spam
  authenticate,
  validateBody(sendInviteSchema),
  invCtrl.sendInviteAsBrand
);

// Send bulk invitations to multiple manufacturers
router.post(
  '/brand/bulk',
  strictRateLimiter(), // Extra strict for bulk operations
  authenticate,
  validateBody(bulkInviteSchema),
  invCtrl.sendBulkInvites
);

// List invitations sent by brand
router.get(
  '/brand',
  authenticate,
  validateQuery(listInvitesQuerySchema),
  invCtrl.listInvitesForBrand
);

// Get specific invitation details (brand perspective)
router.get(
  '/brand/:inviteId',
  authenticate,
  validateParams(inviteParamsSchema),
  invCtrl.getInviteForBrand
);

// Cancel invitation (brand only)
router.delete(
  '/brand/:inviteId',
  strictRateLimiter(), // Security for cancellation
  authenticate,
  validateParams(inviteParamsSchema),
  invCtrl.cancelInvite
);

// ===== MANUFACTURER INVITATION ROUTES =====

// All manufacturer routes require manufacturer authentication
router.use('/manufacturer', authenticateManufacturer);

// List invitations received by manufacturer
router.get(
  '/manufacturer',
  validateQuery(listInvitesQuerySchema),
  invCtrl.listInvitesForManufacturer
);

// Get specific invitation details (manufacturer perspective)
router.get(
  '/manufacturer/:inviteId',
  validateParams(inviteParamsSchema),
  invCtrl.getInviteForManufacturer
);

// Respond to invitation (accept/decline)
router.post(
  '/manufacturer/:inviteId/respond',
  strictRateLimiter(), // Prevent response spam
  validateParams(inviteParamsSchema),
  validateBody(respondToInviteSchema),
  invCtrl.respondToInvite
);

// ===== SHARED/GENERAL ROUTES =====

// Get invitation statistics (authenticated users only)
router.get(
  '/stats',
  authenticate,
  invCtrl.getInvitationStats
);

export default router;

