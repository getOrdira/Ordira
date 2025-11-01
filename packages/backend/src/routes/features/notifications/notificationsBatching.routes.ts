// src/routes/features/notifications/notificationsBatching.routes.ts
// Notification batching routes using modular notification batching controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsBatchingController } from '../../../controllers/features/notifications/notificationsBatching.controller';

const processDigestsQuerySchema = Joi.object({
  referenceDate: Joi.string().isoDate().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Process pending digests
builder.post(
  '/process-digests',
  createHandler(notificationsBatchingController, 'processPendingDigests'),
  {
    validateQuery: processDigestsQuerySchema
  }
);

export default builder.getRouter();