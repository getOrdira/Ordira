// src/routes/features/security/securityAnalytics.routes.ts
// Security analytics routes using modular security analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { securityAnalyticsController } from '../../../controllers/features/security/securityAnalytics.controller';

const suspiciousActivityBodySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  userType: Joi.string().valid('business', 'user', 'manufacturer', 'system').optional(),
  ipAddress: Joi.string().ip().optional()
});

const auditReportQuerySchema = Joi.object({
  userId: Joi.string().trim().optional(),
  days: Joi.number().integer().min(1).max(365).optional()
});

const systemMetricsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Detect suspicious activity
builder.post(
  '/detect-suspicious',
  createHandler(securityAnalyticsController, 'detectSuspiciousActivity'),
  {
    validateBody: suspiciousActivityBodySchema
  }
);

// Get security audit report
builder.get(
  '/audit-report',
  createHandler(securityAnalyticsController, 'getSecurityAuditReport'),
  {
    validateQuery: auditReportQuerySchema
  }
);

// Get system security metrics
builder.get(
  '/metrics',
  createHandler(securityAnalyticsController, 'getSystemSecurityMetrics'),
  {
    validateQuery: systemMetricsQuerySchema
  }
);

export default builder.getRouter();