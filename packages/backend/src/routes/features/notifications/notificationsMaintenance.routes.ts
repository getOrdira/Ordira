// src/routes/features/notifications/notificationsMaintenance.routes.ts
// Notification maintenance routes using modular notification maintenance controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsMaintenanceController } from '../../../controllers/features/notifications/notificationsMaintenance.controller';

const cleanupQuerySchema = Joi.object({
  daysToKeep: Joi.number().integer().min(1).max(365).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Cleanup old notifications
builder.post(
  '/cleanup',
  createHandler(notificationsMaintenanceController, 'cleanupOldNotifications'),
  {
    validateQuery: cleanupQuerySchema
  }
);

export default builder.getRouter();