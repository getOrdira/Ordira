// src/routes/core/health.routes.ts
// System health routes using modular health controller

import { Router } from 'express';
import { healthController } from '../../controllers/core/health.controller';
import { asRouteHandler } from '../../utils/routeHelpers';

const router = Router();

/**
 * Health Check Routes
 */
router.get(
  '/',
  asRouteHandler(healthController.basicHealth.bind(healthController))
);

router.get(
  '/detailed',
  asRouteHandler(healthController.detailedHealth.bind(healthController))
);

router.get(
  '/ready',
  asRouteHandler(healthController.readiness.bind(healthController))
);

router.get(
  '/live',
  asRouteHandler(healthController.liveness.bind(healthController))
);

export default router;

