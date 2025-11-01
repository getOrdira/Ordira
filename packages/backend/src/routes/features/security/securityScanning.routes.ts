// src/routes/features/security/securityScanning.routes.ts
// Security scanning routes using modular security scanning controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { securityScanningController } from '../../../controllers/features/security/securityScanning.controller';

const scanHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Perform security scan
builder.post(
  '/perform',
  createHandler(securityScanningController, 'performSecurityScan')
);

// Get security scan metrics
builder.get(
  '/metrics',
  createHandler(securityScanningController, 'getSecurityScanMetrics')
);

// Get scan history
builder.get(
  '/history',
  createHandler(securityScanningController, 'getScanHistory'),
  {
    validateQuery: scanHistoryQuerySchema
  }
);

// Get unresolved vulnerabilities
builder.get(
  '/vulnerabilities',
  createHandler(securityScanningController, 'getUnresolvedVulnerabilities')
);

// Get scan status
builder.get(
  '/status',
  createHandler(securityScanningController, 'getScanStatus')
);

export default builder.getRouter();