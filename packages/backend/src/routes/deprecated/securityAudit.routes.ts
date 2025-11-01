// src/routes/securityAudit.routes.ts
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/deprecated/unifiedAuth.middleware';
import { dynamicRateLimiter } from '../../middleware/deprecated/rateLimiter.middleware';
import SecurityAuditController from '../../controllers/deprecated/securityAudit.controller';
import { asRouteHandler, asRateLimitHandler } from '../../utils/routeHelpers';

const router = Router();
const securityAuditController = new SecurityAuditController();

// Apply rate limiting to all security audit routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// All routes require authentication
router.use(authenticate);

// Security audit routes
router.get(
  '/audit',
  requirePermission('security:audit'),
  asRouteHandler(securityAuditController.performSecurityAudit.bind(securityAuditController))
);

router.get(
  '/report',
  requirePermission('security:audit'),
  asRouteHandler(securityAuditController.generateSecurityReport.bind(securityAuditController))
);

router.post(
  '/audit-request',
  requirePermission('security:audit'),
  asRouteHandler(securityAuditController.auditRequest.bind(securityAuditController))
);

router.get(
  '/history',
  requirePermission('security:audit'),
  asRouteHandler(securityAuditController.getAuditHistory.bind(securityAuditController))
);

router.get(
  '/metrics',
  requirePermission('security:metrics'),
  asRouteHandler(securityAuditController.getSecurityMetrics.bind(securityAuditController))
);

export default router;
