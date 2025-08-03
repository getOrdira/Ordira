// src/routes/certificates.routes.ts
import { Router } from 'express';
import * as certCtrl from '../controllers/certificate.controller';
import { validateBody } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

const createCertSchema = Joi.object({
  productId:     Joi.string().hex().length(24).required(),
  recipient:     Joi.string().required(),
  contactMethod: Joi.string().valid('email').required()
});

router.post(
  '/',
  validateBody(createCertSchema),
  certCtrl.createCert
);

router.get('/', certCtrl.listCerts);

export default router;
