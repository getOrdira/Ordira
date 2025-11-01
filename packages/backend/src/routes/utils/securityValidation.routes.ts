// src/routes/utils/securityValidation.routes.ts
// Security validation administration routes using modular security validation controller

import { createRouteBuilder, RouteConfigs, createHandler } from '../core/base.routes';
import { securityValidationController } from '../../controllers/middleware/securityValidation.controller';

const builder = createRouteBuilder({
  requireAuth: true,
  requireTenant: false,
  rateLimit: 'strict'
});

// Get security validation stats
builder.get(
  '/stats',
  createHandler(securityValidationController, 'getSecurityStats')
);

// Clear security validation data
builder.post(
  '/clear',
  createHandler(securityValidationController, 'clearSecurityData')
);

export default builder.getRouter();
