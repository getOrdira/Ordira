// src/routes/features/notifications/notificationsInbox.routes.ts
// Notification inbox routes using modular notification inbox controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsInboxController } from '../../../controllers/features/notifications/notificationsInbox.controller';

const objectIdSchema = Joi.string().hex().length(24);

const notificationIdParamsSchema = Joi.object({
  id: objectIdSchema.required()
});

const listNotificationsQuerySchema = Joi.object({
  type: Joi.string().trim().max(100).optional(),
  category: Joi.string().trim().max(100).optional(),
  priority: Joi.string().trim().max(50).optional(),
  read: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional()
});

const bulkDeleteBodySchema = Joi.object({
  notificationIds: Joi.array().items(objectIdSchema).min(1).max(100).required()
});

const createNotificationBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  type: Joi.string().trim().max(100).required(),
  message: Joi.string().trim().max(2000).required(),
  category: Joi.string().trim().max(100).optional(),
  priority: Joi.string().trim().max(50).optional(),
  title: Joi.string().trim().max(200).optional(),
  actionUrl: Joi.string().uri().max(500).optional(),
  data: Joi.object().unknown(true).optional(),
  templateId: Joi.string().trim().max(100).optional(),
  templateData: Joi.object().unknown(true).optional()
});

const notificationsByTypeParamsSchema = Joi.object({
  type: Joi.string().trim().max(100).required()
});

const notificationsByTypeQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// List notifications
builder.get(
  '/',
  createHandler(notificationsInboxController, 'listNotifications'),
  {
    validateQuery: listNotificationsQuerySchema
  }
);

// Get unread notifications
builder.get(
  '/unread',
  createHandler(notificationsInboxController, 'getUnreadNotifications')
);

// Get notification by ID
builder.get(
  '/:id',
  createHandler(notificationsInboxController, 'getNotification'),
  {
    validateParams: notificationIdParamsSchema
  }
);

// Mark notification as read
builder.patch(
  '/:id/read',
  createHandler(notificationsInboxController, 'markNotificationAsRead'),
  {
    validateParams: notificationIdParamsSchema
  }
);

// Mark all as read
builder.post(
  '/mark-all-read',
  createHandler(notificationsInboxController, 'markAllAsRead')
);

// Delete notification
builder.delete(
  '/:id',
  createHandler(notificationsInboxController, 'deleteNotification'),
  {
    validateParams: notificationIdParamsSchema
  }
);

// Bulk delete notifications
builder.post(
  '/bulk-delete',
  createHandler(notificationsInboxController, 'bulkDeleteNotifications'),
  {
    validateBody: bulkDeleteBodySchema
  }
);

// Get notifications by type
builder.get(
  '/type/:type',
  createHandler(notificationsInboxController, 'getNotificationsByType'),
  {
    validateParams: notificationsByTypeParamsSchema,
    validateQuery: notificationsByTypeQuerySchema
  }
);

// Create notification
builder.post(
  '/',
  createHandler(notificationsInboxController, 'createNotification'),
  {
    validateBody: createNotificationBodySchema
  }
);

export default builder.getRouter();