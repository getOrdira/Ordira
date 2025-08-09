// src/routes/domainMapping.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  addDomain,
  verifyDomain,
  removeDomain,
  listDomains,
  getDomainStatus
} from '../controllers/domainMapping.controller';
import {
  addDomainSchema,
  domainParamsSchema,
  listDomainsQuerySchema
} from '../validation/domainMapping.validation';

const router = Router();

// Apply dynamic rate limiting to all domain mapping routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// GET /domains - List all domains for the brand
router.get(
  '/',
  validateQuery(listDomainsQuerySchema),
  listDomains
);

// GET /domains/:domain/status - Get domain verification status
router.get(
  '/:domain/status',
  validateParams(domainParamsSchema),
  getDomainStatus
);

// POST /domains - Add new custom domain (strict rate limiting)
router.post(
  '/',
  strictRateLimiter(), // Prevent domain abuse
  validateBody(addDomainSchema),
  addDomain
);

// POST /domains/:domain/verify - Verify domain ownership
router.post(
  '/:domain/verify',
  strictRateLimiter(), // Prevent verification spam
  validateParams(domainParamsSchema),
  verifyDomain
);

// DELETE /domains/:domain - Remove custom domain
router.delete(
  '/:domain',
  strictRateLimiter(), // Security for domain removal
  validateParams(domainParamsSchema),
  removeDomain
);

export default router;
