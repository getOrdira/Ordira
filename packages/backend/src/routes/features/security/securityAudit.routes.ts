// src/routes/features/security/securityAudit.routes.ts
// Security audit routes using modular security audit controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { securityAuditController } from '../../../controllers/features/security/securityAudit.controller';

const auditHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional()
});

const securityMetricsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Perform security audit
builder.post(
  '/perform',
  createHandler(securityAuditController, 'performSecurityAudit')
);

// Generate security report
builder.get(
  '/report',
  createHandler(securityAuditController, 'generateSecurityReport')
);

// Audit request
builder.post(
  '/request',
  createHandler(securityAuditController, 'auditRequest')
);

// Get audit history
builder.get(
  '/history',
  createHandler(securityAuditController, 'getAuditHistory'),
  {
    validateQuery: auditHistoryQuerySchema
  }
);

// Get security metrics
builder.get(
  '/metrics',
  createHandler(securityAuditController, 'getSecurityMetrics'),
  {
    validateQuery: securityMetricsQuerySchema
  }
);

export default builder.getRouter();