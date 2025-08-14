// src/routes/notification.routes.ts
import { Router } from 'express';
import { validateParams, validateQuery, validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  getNotifications,
  readNotification,
  readAllNotifications,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationStats
} from '../controllers/notification.controller';
import {
  notificationParamsSchema,
  listNotificationsQuerySchema,
  notificationSettingsSchema,
  bulkNotificationActionSchema
} from '../validation/notification.validation';

const router = Router();

// Apply dynamic rate limiting to all notification routes
router.use(dynamicRateLimiter());

// ===== BRAND NOTIFICATION ROUTES =====

const brandRouter = Router();
brandRouter.use(authenticate); // Brand authentication required

// Get brand notifications with filtering and pagination
brandRouter.get(
  '/',
  validateQuery(listNotificationsQuerySchema),
  getNotifications
);

// Get specific notification details
brandRouter.get(
  '/:id',
  validateParams(notificationParamsSchema),
  getNotifications
);

// Mark notification as read
brandRouter.put(
  '/:id/read',
  validateParams(notificationParamsSchema),
  readNotification
);

// Delete notification
brandRouter.delete(
  '/:id',
  validateParams(notificationParamsSchema),
  deleteNotification
);

// Mark all notifications as read
brandRouter.put(
  '/read-all',
  readAllNotifications
);

// Bulk notification actions
brandRouter.post(
  '/bulk',
  validateBody(bulkNotificationActionSchema),
  readAllNotifications
);

// Get notification settings
brandRouter.get(
  '/settings',
  getNotificationSettings
);

// Update notification settings
brandRouter.put(
  '/settings',
  validateBody(notificationSettingsSchema),
  updateNotificationSettings
);

// Get notification statistics
brandRouter.get(
  '/stats',
  validateQuery(listNotificationsQuerySchema),
  getNotificationStats
);

// ===== MANUFACTURER NOTIFICATION ROUTES =====

const manufacturerRouter = Router();
manufacturerRouter.use(authenticateManufacturer); // Manufacturer authentication required

// Get manufacturer notifications with filtering and pagination
manufacturerRouter.get(
  '/',
  validateQuery(listNotificationsQuerySchema),
  getNotifications
);

// Get specific notification details
manufacturerRouter.get(
  '/:id',
  validateParams(notificationParamsSchema),
  getNotifications
);

// Mark notification as read
manufacturerRouter.put(
  '/:id/read',
  validateParams(notificationParamsSchema),
  readNotification
);

// Delete notification
manufacturerRouter.delete(
  '/:id',
  validateParams(notificationParamsSchema),
  deleteNotification
);

// Mark all notifications as read
manufacturerRouter.put(
  '/read-all',
  readAllNotifications
);

// Bulk notification actions
manufacturerRouter.post(
  '/bulk',
  validateBody(bulkNotificationActionSchema),
  readAllNotifications
);

// Get notification settings
manufacturerRouter.get(
  '/settings',
  getNotificationSettings
);

// Update notification settings
manufacturerRouter.put(
  '/settings',
  validateBody(notificationSettingsSchema),
  updateNotificationSettings
);

// Get notification statistics
manufacturerRouter.get(
  '/stats',
  validateQuery(listNotificationsQuerySchema),
  getNotificationStats
);

// ===== SHARED NOTIFICATION ROUTES =====

// Health check for notification service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notifications',
    timestamp: new Date().toISOString()
  });
});

// ===== MOUNT SUB-ROUTERS =====

// Mount brand and manufacturer notification routes
router.use('/brand', brandRouter);
router.use('/manufacturer', manufacturerRouter);

export default router;

