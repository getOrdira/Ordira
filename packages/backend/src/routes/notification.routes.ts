
// src/routes/notification.routes.ts
import { Router } from 'express';
import { validateParams, validateQuery, validateBody } from '../middleware/validation.middleware';
import { authenticate, requireManufacturer } from '../middleware/unifiedAuth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as notificationCtrl from '../controllers/notification.controller';
import {
  notificationParamsSchema,
  listNotificationsQuerySchema,
  notificationSettingsSchema,
  bulkNotificationActionSchema,
  notificationValidationSchemas
} from '../validation/notification.validation';
import Joi from 'joi';
import { asRouteHandler } from '../utils/routeHelpers';

// ===== DUAL AUTHENTICATION INTERFACE =====
interface DualUnifiedAuthRequest extends Request {
  userType?: 'business' | 'manufacturer';
  userId?: string;
  manufacturer?: any;
  tenant?: { business: { toString: () => string } };
}

const router = Router();

// Apply dynamic rate limiting to all notification routes
router.use(dynamicRateLimiter());

// ===== DUAL AUTHENTICATION MIDDLEWARE =====
// Supports both business and manufacturer authentication
router.use((req: any, res, next) => {
  // Try brand/business authentication first
  authenticate(req, res, (brandErr) => {
    if (!brandErr) {
      req.userType = 'business';
      // Apply tenant resolution for business users
      return resolveTenant(req, res, next);
    }
    
    // If brand auth fails, try manufacturer authentication
    requireManufacturer(req, res, (mfgErr) => {
      if (!mfgErr) {
        req.userType = 'manufacturer';
        return next();
      }
      
      // Both authentications failed
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Valid business or manufacturer authentication required',
        code: 'AUTH_REQUIRED'
      });
    });
  });
});

// ===== CORE NOTIFICATION ROUTES =====

/**
 * GET /api/notifications
 * Get notifications for authenticated user with advanced filtering
 * 
 * @requires authentication (business OR manufacturer)
 * @optional query: filtering, pagination, sorting options
 * @returns { notifications[], stats, pagination, filters }
 */
router.get(
  '/',
  validateQuery(listNotificationsQuerySchema),
  trackManufacturerAction('view_notifications'),
  asRouteHandler(notificationCtrl.getNotifications)
);

/**
 * GET /api/notifications/stats
 * Get comprehensive notification statistics and analytics
 * 
 * @requires authentication (business OR manufacturer)
 * @returns { totalStats, typeBreakdown, priorityBreakdown, recentActivity }
 */
router.get(
  '/stats',
  trackManufacturerAction('view_notification_stats'),
  asRouteHandler(notificationCtrl.getNotificationStats)
);

/**
 * GET /api/notifications/unread/count
 * Get unread notifications count with breakdown
 * 
 * @requires authentication (business OR manufacturer)
 * @returns { count, hasUnread, breakdown }
 */
router.get(
  '/unread/count',
  trackManufacturerAction('check_unread_count'),
  asRouteHandler(notificationCtrl.getUnreadCount)
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 * 
 * @requires authentication (business OR manufacturer)
 * @returns { markedCount, stats }
 */
router.put(
  '/read-all',
  trackManufacturerAction('mark_all_notifications_read'),
  asRouteHandler(notificationCtrl.markAllAsRead)
);

/**
 * POST /api/notifications/bulk
 * Perform bulk actions on notifications
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: { notificationIds: string[], action: string }
 * @rate-limited: strict for security
 * @returns { processed, results, stats }
 */
router.post(
  '/bulk',
  strictRateLimiter(), // Strict rate limiting for bulk operations
  validateBody(bulkNotificationActionSchema),
  trackManufacturerAction('bulk_notification_action'),
  asRouteHandler(notificationCtrl.bulkNotificationAction)
);

/**
 * DELETE /api/notifications/bulk
 * Bulk delete notifications using service method
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: { notificationIds: string[] }
 * @rate-limited: strict for security
 * @returns { deleted, summary }
 */
router.delete(
  '/bulk',
  strictRateLimiter(), // Strict rate limiting for bulk deletions
  validateBody(Joi.object({
    notificationIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one notification ID must be provided',
        'array.max': 'Cannot delete more than 100 notifications at once',
        'string.pattern.base': 'Each notification ID must be a valid MongoDB ObjectId'
      })
  })),
  trackManufacturerAction('bulk_delete_notifications'),
  asRouteHandler(notificationCtrl.bulkDeleteNotifications)
);

/**
 * GET /api/notifications/type/:type
 * Get notifications by specific type
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { type: string }
 * @returns { notifications[], typeStats, insights }
 */
router.get(
  '/type/:type',
  validateParams(Joi.object({
    type: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Notification type is required',
        'string.max': 'Type cannot exceed 50 characters'
      })
  })),
  trackManufacturerAction('view_notifications_by_type'),
  asRouteHandler(notificationCtrl.getNotificationsByType)
);

/**
 * GET /api/notifications/:id
 * Get specific notification details by ID
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @returns { notification, relatedNotifications }
 */
router.get(
  '/:id',
  validateParams(notificationParamsSchema),
  trackManufacturerAction('view_notification_details'),
  asRouteHandler(notificationCtrl.getNotificationDetails)
);

/**
 * PUT /api/notifications/:id/read
 * Mark specific notification as read
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @returns { notification, updated }
 */
router.put(
  '/:id/read',
  validateParams(notificationParamsSchema),
  trackManufacturerAction('mark_notification_read'),
  asRouteHandler(notificationCtrl.readNotification)
);

/**
 * DELETE /api/notifications/:id
 * Delete specific notification
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @rate-limited: strict for security
 * @returns { deleted, notificationId }
 */
router.delete(
  '/:id',
  strictRateLimiter(), // Strict rate limiting for individual deletions
  validateParams(notificationParamsSchema),
  trackManufacturerAction('delete_notification'),
  asRouteHandler(notificationCtrl.deleteNotification)
);

// ===== NOTIFICATION MANAGEMENT & SETTINGS =====

/**
 * POST /api/notifications
 * Create a new notification (admin/system use)
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: notification creation data
 * @rate-limited: strict to prevent spam
 * @returns { notification, created }
 */
router.post(
  '/',
  strictRateLimiter(), // Strict rate limiting for creation
  validateBody(Joi.object({
    recipientId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Recipient ID must be a valid MongoDB ObjectId'
      }),
    recipientType: Joi.string()
      .valid('business', 'manufacturer')
      .optional(),
    type: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required(),
    category: Joi.string()
      .valid('system', 'billing', 'certificate', 'vote', 'invite', 'order', 'security')
      .required(),
    title: Joi.string()
      .trim()
      .max(200)
      .optional(),
    message: Joi.string()
      .trim()
      .min(1)
      .max(2000)
      .required(),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .default('medium')
      .optional(),
    actionUrl: Joi.string()
      .uri()
      .optional(),
    expiresAt: Joi.date()
      .iso()
      .min('now')
      .optional(),
    data: Joi.object().optional()
  })),
  trackManufacturerAction('create_notification'),
  asRouteHandler(notificationCtrl.createNotification)
);


// ===== NOTIFICATION SETTINGS & PREFERENCES =====

/**
 * GET /api/notifications/settings
 * Get user notification settings and preferences
 * 
 * @requires authentication (business OR manufacturer)
 * @returns { settings, preferences, channels }
 */
router.get(
  '/settings',
  trackManufacturerAction('view_notification_settings'),
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented in the controller
      res.json({
        success: true,
        message: 'Notification settings retrieved successfully',
        data: {
          userType: req.userType,
          settings: {
            email: {
              enabled: true,
              frequency: 'immediate',
              types: ['invitation', 'order', 'payment', 'certificate', 'security']
            },
            push: {
              enabled: true,
              types: ['urgent', 'security', 'certificate'],
              quietHours: {
                enabled: false,
                startTime: '22:00',
                endTime: '08:00',
                timezone: 'UTC'
              }
            },
            sms: {
              enabled: false,
              types: ['security', 'urgent']
            },
            inApp: {
              enabled: true,
              autoMarkAsRead: false,
              retentionDays: 30
            }
          },
          preferences: {
            language: 'en',
            timezone: 'UTC',
            groupSimilar: true,
            maxPerDay: 50
          },
          note: 'Settings management to be implemented in controller'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/notifications/settings
 * Update user notification settings and preferences
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: notification settings data
 * @returns { settings, updated }
 */
router.put(
  '/settings',
  validateBody(notificationSettingsSchema),
  trackManufacturerAction('update_notification_settings'),
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented in the controller
      res.json({
        success: true,
        message: 'Notification settings updated successfully',
        data: {
          settings: req.body,
          updatedAt: new Date().toISOString(),
          note: 'Settings update to be implemented in controller'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== MAINTENANCE & CLEANUP ROUTES =====

/**
 * DELETE /api/notifications/cleanup
 * Clean up old notifications (maintenance endpoint)
 * 
 * @requires authentication
 * @optional query: { daysToKeep?: number }
 * @rate-limited: strict for maintenance operations
 * @returns { cleaned, summary }
 */
router.delete(
  '/cleanup',
  strictRateLimiter(), // Strict rate limiting for cleanup
  validateQuery(Joi.object({
    daysToKeep: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(90)
      .optional()
      .messages({
        'number.min': 'Days to keep must be at least 1',
        'number.max': 'Days to keep cannot exceed 365'
      })
  })),
  trackManufacturerAction('cleanup_old_notifications'),
  asRouteHandler(notificationCtrl.cleanupOldNotifications)
);

// ===== HEALTH CHECK ROUTE =====

/**
 * GET /api/notifications/health
 * Health check for notification service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'notifications',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      dualAuthentication: true,
      bulkOperations: true,
      realTimeUpdates: false,
      emailIntegration: true,
      pushNotifications: false
    }
  });
});

// ===== ERROR HANDLING =====

/**
 * Notification-specific error handler
 */
router.use((error: any, req: any, res: any, next: any) => {
  // Log notification-specific errors
  console.error('Notification Error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    userId: req.userId,
    userType: req.userType,
    timestamp: new Date().toISOString()
  });

  // Handle specific notification errors
  if (error.message?.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found',
      message: 'The specified notification could not be found',
      code: 'NOTIFICATION_NOT_FOUND'
    });
  }

  if (error.message?.includes('already read')) {
    return res.status(400).json({
      success: false,
      error: 'Already processed',
      message: 'Notification has already been marked as read',
      code: 'NOTIFICATION_ALREADY_READ'
    });
  }

  if (error.message?.includes('bulk limit')) {
    return res.status(400).json({
      success: false,
      error: 'Bulk operation limit exceeded',
      message: 'Too many notifications in bulk operation',
      code: 'BULK_LIMIT_EXCEEDED'
    });
  }

  if (error.message?.includes('permission denied')) {
    return res.status(403).json({
      success: false,
      error: 'Permission denied',
      message: 'You do not have permission to access this notification',
      code: 'NOTIFICATION_ACCESS_DENIED'
    });
  }

  // Pass to global error handler
  next(error);
});

export default router;

