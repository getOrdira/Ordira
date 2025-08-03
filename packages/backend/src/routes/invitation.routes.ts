// src/routes/invitation.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { validateBody } from '../middleware/validation.middleware';
import * as invCtrl from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';

const router = Router();

// Joi schemas
const sendInviteSchema = Joi.object({
  manufacturerId: Joi.string().hex().length(24).required()
});

const respondSchema = Joi.object({
  accept: Joi.boolean().required()
});

// Brand sends an invite to a manufacturer
router.post(
  '/brand',
  authenticate,
  validateBody(sendInviteSchema),
  invCtrl.sendInviteAsBrand
);
router.get(
  '/brand',
  authenticate,
  invCtrl.listInvitesForBrand
);

// Manufacturer views/responds
router.use(authenticateManufacturer);

router.get(
  '/manufacturer',
  invCtrl.listInvitesForManufacturer
);

router.post(
  '/:inviteId/respond',
  validateBody(respondSchema),
  invCtrl.respondToInvite
);

export default router;

