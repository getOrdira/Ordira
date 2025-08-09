// src/routes/certificate.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as certCtrl from '../controllers/certificate.controller';
import {
  createCertificateSchema,
  listCertificatesQuerySchema,
  certificateParamsSchema,
  batchCreateCertificatesSchema
} from '../validation/certificate.validation';

const router = Router();

// Apply dynamic rate limiting to all certificate routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// GET /certificates - List certificates with query filtering
router.get(
  '/',
  validateQuery(listCertificatesQuerySchema),
  certCtrl.listCerts
);

// GET /certificates/:id - Get specific certificate
router.get(
  '/:id',
  validateParams(certificateParamsSchema),
  certCtrl.getCertificate
);

// POST /certificates - Create single certificate (strict rate limiting)
router.post(
  '/',
  strictRateLimiter(), // Prevent certificate spam
  validateBody(createCertificateSchema),
  certCtrl.createCert
);

// POST /certificates/batch - Create multiple certificates (extra strict rate limiting)
router.post(
  '/batch',
  strictRateLimiter(), // Very strict for batch operations
  validateBody(batchCreateCertificatesSchema),
  certCtrl.createBatchCertificates
);

// PUT /certificates/:id/transfer - Transfer certificate to new recipient
router.put(
  '/:id/transfer',
  strictRateLimiter(), // Security for transfers
  validateParams(certificateParamsSchema),
  validateBody(createCertificateSchema.extract(['recipient'])),
  certCtrl.transferCertificate
);

// DELETE /certificates/:id - Revoke certificate (admin only)
router.delete(
  '/:id',
  strictRateLimiter(), // Security for revocation
  validateParams(certificateParamsSchema),
  certCtrl.revokeCertificate
);

export default router;
