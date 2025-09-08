// src/controllers/notification.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ManufacturerAuthRequest } from '../middleware/manufacturerAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { NotificationService } from '../services/business/notification.service';

// Initialize service
const notificationService = new NotificationService();

/**
 * Extended request interfaces for type safety
 */
interface BaseNotificationQuery {
  validatedQuery: {
    type?: string;
    category?: 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    read?: boolean;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'createdAt' | 'priority' | 'type';
    sortOrder?: 'asc' | 'desc';
  };
  userType?: 'business' | 'manufacturer';
}

type NotificationListRequest = (AuthRequest | ManufacturerAuthRequest) & ValidatedRequest & BaseNotificationQuery;

interface BaseNotificationAction {
  validatedParams: { id: string };
  userType?: 'business' | 'manufacturer';
}

type NotificationActionRequest = (AuthRequest | ManufacturerAuthRequest) & ValidatedRequest & BaseNotificationAction;

interface BaseBulkAction {
  validatedBody: {
    notificationIds: string[];
    action: 'read' | 'unread' | 'delete' | 'archive';
  };
  userType?: 'business' | 'manufacturer';
}

type BulkActionRequest = (AuthRequest | ManufacturerAuthRequest) & ValidatedRequest & BaseBulkAction;

interface BaseCreateNotification {
  validatedBody: {
    recipientId?: string;
    recipientType?: 'business' | 'manufacturer';
    type: string;
    category: 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security';
    title?: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    actionUrl?: string;
    expiresAt?: string;
    data?: any;
  };
}

type CreateNotificationRequest = (AuthRequest | ManufacturerAuthRequest) & ValidatedRequest & BaseCreateNotification;

interface BaseBulkNotification {
  validatedBody: {
    recipients: Array<{
      id: string;
      type: 'business' | 'manufacturer';
      email?: string;
      name?: string;
    }>;
    subject: string;
    message: string;
    notificationType: string;
    category: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    batchSize?: number;
    delayBetweenBatches?: number;
  };
}

type BulkNotificationRequest = (AuthRequest | ManufacturerAuthRequest) & ValidatedRequest & BaseBulkNotification;

/**
 * Helper to determine user context
 */
function getUserContext(req: AuthRequest | ManufacturerAuthRequest): {
  userId: string;
  userType: 'business' | 'manufacturer';
  businessId?: string;
  manufacturerId?: string;
} {
  // Check if it's a manufacturer request
  if ('manufacturer' in req && req.manufacturer) {
    return {
      userId: req.userId!,
      userType: 'manufacturer',
      manufacturerId: req.userId!
    };
  }
  
  // Default to business request
  return {
    userId: req.userId!,
    userType: 'business',
    businessId: req.userId!
  };
}

/**
 * Get notifications for authenticated user with advanced filtering
 * GET /api/notifications
 * 
 * @requires authentication (business or manufacturer)
 * @optional query: filtering, pagination, sorting options
 * @returns { notifications[], stats, pagination, filters }
 */
export const getNotifications = asyncHandler(async (
  req: NotificationListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  // Extract and validate query parameters
  const queryParams = req.validatedQuery || {};
  const page = queryParams.page || 1;
  const limit = Math.min(queryParams.limit || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Parse date filters
  const dateFrom = queryParams.dateFrom ? new Date(queryParams.dateFrom) : undefined;
  const dateTo = queryParams.dateTo ? new Date(queryParams.dateTo) : undefined;

  // Build comprehensive filter options
  const filterOptions = {
    type: queryParams.type,
    category: queryParams.category,
    priority: queryParams.priority,
    read: queryParams.read,
    dateFrom,
    dateTo,
    limit,
    offset,
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc'
  };

  // Get notifications and stats through service
  const [result, stats] = await Promise.all([
    notificationService.listNotifications(
      userContext.businessId,
      userContext.manufacturerId,
      filterOptions
    ),
    notificationService.getNotificationStats(
      userContext.businessId,
      userContext.manufacturerId
    )
  ]);

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications: result.notifications,
      stats: {
        total: result.total,
        unread: result.unread,
        read: result.total - result.unread,
        byType: stats.byType,
        recent: stats.recent
      },
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      },
      filters: {
        type: queryParams.type,
        category: queryParams.category,
        priority: queryParams.priority,
        read: queryParams.read,
        dateRange: {
          from: dateFrom?.toISOString(),
          to: dateTo?.toISOString()
        },
        sortBy: filterOptions.sortBy,
        sortOrder: filterOptions.sortOrder
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Get notification statistics and analytics
 * GET /api/notifications/stats
 * 
 * @requires authentication (business or manufacturer)
 * @returns { totalStats, typeBreakdown, priorityBreakdown, recentActivity }
 */
export const getNotificationStats = asyncHandler(async (
  req: AuthRequest | ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
 ): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Get comprehensive statistics through service
  const stats = await notificationService.getNotificationStats(
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return detailed statistics
  res.json({
    success: true,
    message: 'Notification statistics retrieved successfully',
    data: {
      overview: {
        total: stats.total,
        unread: stats.unread,
        read: stats.total - stats.unread,
        readPercentage: stats.total > 0 ? Math.round(((stats.total - stats.unread) / stats.total) * 100) : 0,
        recent: stats.recent
      },
      breakdown: {
        byType: stats.byType,
        totalTypes: Object.keys(stats.byType).length
      },
      trends: {
        recentActivity: stats.recent,
        dailyAverage: Math.round(stats.recent / 7), // Last 7 days average
        needsAttention: stats.unread > 10
      },
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Mark a notification as read
 * PUT /api/notifications/:id/read
 * 
 * @requires authentication (business or manufacturer)
 * @requires params: { id: string }
 * @returns { notification, updated }
 */
export const readNotification = asyncHandler(async (
  req: NotificationActionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  // Extract notification ID from validated params
  const { id } = req.validatedParams;

  // Mark notification as read through service
  const updatedNotification = await notificationService.markAsRead(
    id,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.json({
    success: true,
    message: 'Notification marked as read',
    data: {
      notification: updatedNotification,
      readAt: new Date().toISOString()
    }
  });
});

/**
 * Get notification details by ID
 * GET /api/notifications/:id
 * 
 * @requires authentication (business or manufacturer)
 * @requires params: { id: string }
 * @returns { notification, relatedNotifications }
 */
export const getNotificationDetails = asyncHandler(async (
  req: NotificationActionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  // Extract notification ID from validated params
  const { id } = req.validatedParams;

  // Get notification details and related notifications
  const [notification, relatedNotifications] = await Promise.all([
    notificationService.getNotificationById(
      id,
      userContext.businessId,
      userContext.manufacturerId
    ),
    notificationService.getNotificationsByType(
      '', // Will be filled by the notification type
      userContext.businessId,
      userContext.manufacturerId,
      5 // Limit to 5 related notifications
    )
  ]);

  // Get related notifications of the same type
  const sameTypeNotifications = await notificationService.getNotificationsByType(
    notification.type,
    userContext.businessId,
    userContext.manufacturerId,
    5
  );

  // Return detailed response
  res.json({
    success: true,
    message: 'Notification details retrieved successfully',
    data: {
      notification,
      relatedNotifications: sameTypeNotifications.filter(n => n.id !== id),
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Get unread notifications count
 * GET /api/notifications/unread/count
 * 
 * @requires authentication (business or manufacturer)
 * @returns { count, hasUnread, breakdown }
 */
export const getUnreadCount = asyncHandler(async (
  req: AuthRequest | ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Get unread notifications and stats
  const [unreadNotifications, stats] = await Promise.all([
    notificationService.getUnreadNotifications(
      userContext.businessId,
      userContext.manufacturerId
    ),
    notificationService.getNotificationStats(
      userContext.businessId,
      userContext.manufacturerId
    )
  ]);

  const count = unreadNotifications.length;

  // Group unread by type for breakdown
  const typeBreakdown = unreadNotifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Return comprehensive unread information
  res.json({
    success: true,
    message: 'Unread count retrieved successfully',
    data: {
      count,
      hasUnread: count > 0,
      breakdown: {
        byType: typeBreakdown,
        urgent: unreadNotifications.filter(n => (n as any).priority === 'urgent').length,
        high: unreadNotifications.filter(n => (n as any).priority === 'high').length,
        recent: unreadNotifications.filter(n => 
          new Date(n.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length
      },
      percentage: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 * 
 * @requires authentication (business or manufacturer)
 * @returns { markedCount, stats }
 */
export const markAllAsRead = asyncHandler(async (
  req: AuthRequest | ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Mark all notifications as read through service
  const result = await notificationService.markAllAsRead(
    userContext.businessId,
    userContext.manufacturerId
  );

  // Get updated stats
  const updatedStats = await notificationService.getNotificationStats(
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.json({
    success: true,
    message: `${result.modified} notifications marked as read`,
    data: {
      markedCount: result.modified,
      remainingUnread: updatedStats.unread,
      totalNotifications: updatedStats.total,
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Get notifications by type
 * GET /api/notifications/type/:type
 * 
 * @requires authentication (business or manufacturer)
 * @requires params: { type: string }
 * @returns { notifications[], typeStats, insights }
 */
export const getNotificationsByType = asyncHandler(async (
  req: (AuthRequest | ManufacturerAuthRequest) & { params: { type: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  const { type } = req.params;

  if (!type || type.trim().length === 0) {
    throw createAppError('Notification type is required', 400, 'MISSING_TYPE');
  }

  // Get notifications by type and overall stats
  const [notifications, allStats] = await Promise.all([
    notificationService.getNotificationsByType(
      type,
      userContext.businessId,
      userContext.manufacturerId,
      50 // Increased limit for type-specific queries
    ),
    notificationService.getNotificationStats(
      userContext.businessId,
      userContext.manufacturerId
    )
  ]);

  const typeCount = allStats.byType[type] || 0;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Return comprehensive type-specific data
  res.json({
    success: true,
    message: `Notifications of type '${type}' retrieved successfully`,
    data: {
      type,
      notifications,
      stats: {
        total: notifications.length,
        unread: unreadCount,
        read: notifications.length - unreadCount,
        percentageOfAll: allStats.total > 0 ? Math.round((typeCount / allStats.total) * 100) : 0
      },
      insights: {
        mostRecentAt: notifications.length > 0 ? notifications[0].createdAt : null,
        averagePerWeek: Math.round(typeCount / 4), // Rough estimate
        needsAttention: unreadCount > 5
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 * 
 * @requires authentication (business or manufacturer)
 * @requires params: { id: string }
 * @returns { deleted, notificationId }
 */
export const deleteNotification = asyncHandler(async (
  req: NotificationActionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  // Extract notification ID from validated params
  const { id } = req.validatedParams;

  // Delete notification through service
  await notificationService.deleteNotification(
    id,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.json({
    success: true,
    message: 'Notification deleted successfully',
    data: {
      deleted: true,
      notificationId: id,
      deletedAt: new Date().toISOString()
    }
  });
});

/**
 * Perform bulk actions on notifications
 * POST /api/notifications/bulk
 * 
 * @requires authentication (business or manufacturer)
 * @requires validation: { notificationIds: string[], action: string }
 * @returns { processed, results, stats }
 */
export const bulkNotificationAction = asyncHandler(async (
  req: BulkActionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  // Extract validated bulk action data
  const { notificationIds, action } = req.validatedBody;

  if (!notificationIds || notificationIds.length === 0) {
    throw createAppError('At least one notification ID is required', 400, 'MISSING_NOTIFICATION_IDS');
  }

  if (notificationIds.length > 100) {
    throw createAppError('Maximum 100 notifications can be processed at once', 400, 'TOO_MANY_NOTIFICATIONS');
  }

  const validActions = ['read', 'unread', 'delete', 'archive'];
  if (!validActions.includes(action)) {
    throw createAppError(`Invalid action. Valid actions: ${validActions.join(', ')}`, 400, 'INVALID_ACTION');
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  // Process bulk actions using service methods
  for (const notificationId of notificationIds) {
    try {
      switch (action) {
        case 'read':
          await notificationService.markAsRead(
            notificationId,
            userContext.businessId,
            userContext.manufacturerId
          );
          break;
        
        case 'delete':
          await notificationService.deleteNotification(
            notificationId,
            userContext.businessId,
            userContext.manufacturerId
          );
          break;
        
        case 'unread':
          // Implement unread functionality if needed
          throw new Error('Unread action not yet implemented');
        
        case 'archive':
          // Implement archive functionality if needed
          throw new Error('Archive action not yet implemented');
        
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
      
      results.push({
        id: notificationId,
        status: 'success',
        action
      });
      successCount++;
    } catch (error: any) {
      results.push({
        id: notificationId,
        status: 'error',
        error: error.message || 'Unknown error'
      });
      errorCount++;
    }
  }

  // Get updated stats after bulk operation
  const updatedStats = await notificationService.getNotificationStats(
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return comprehensive response
  res.json({
    success: true,
    message: `Bulk ${action} completed: ${successCount} successful, ${errorCount} failed`,
    data: {
      action,
      processed: notificationIds.length,
      successful: successCount,
      failed: errorCount,
      results,
      updatedStats: {
        total: updatedStats.total,
        unread: updatedStats.unread,
        read: updatedStats.total - updatedStats.unread
      },
      processedAt: new Date().toISOString()
    }
  });
});

/**
 * Bulk delete notifications using service method
 * DELETE /api/notifications/bulk
 * 
 * @requires authentication (business or manufacturer)
 * @requires validation: { notificationIds: string[] }
 * @returns { deleted, summary }
 */
export const bulkDeleteNotifications = asyncHandler(async (
  req: (AuthRequest | ManufacturerAuthRequest) & {
    validatedBody: { notificationIds: string[] }
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  const { notificationIds } = req.validatedBody;

  if (!notificationIds || notificationIds.length === 0) {
    throw createAppError('At least one notification ID is required', 400, 'MISSING_NOTIFICATION_IDS');
  }

  if (notificationIds.length > 100) {
    throw createAppError('Maximum 100 notifications can be deleted at once', 400, 'TOO_MANY_NOTIFICATIONS');
  }

  // Use service bulk delete method
  const result = await notificationService.bulkDeleteNotifications(
    notificationIds,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Get updated stats
  const updatedStats = await notificationService.getNotificationStats(
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.json({
    success: true,
    message: `${result.deleted} notifications deleted successfully`,
    data: {
      deleted: result.deleted,
      requested: notificationIds.length,
      notFound: notificationIds.length - result.deleted,
      updatedStats: {
        total: updatedStats.total,
        unread: updatedStats.unread
      },
      deletedAt: new Date().toISOString()
    }
  });
});

/**
 * Create a new notification (admin/system use)
 * POST /api/notifications
 * 
 * @requires authentication (business or manufacturer)
 * @requires validation: notification data
 * @returns { notification, created }
 */
export const createNotification = asyncHandler(async (
  req: CreateNotificationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  
  const {
    recipientId,
    recipientType,
    type,
    category,
    title,
    message,
    priority,
    actionUrl,
    expiresAt,
    data
  } = req.validatedBody;

  // Determine recipient
  const targetBusinessId = recipientType === 'business' 
    ? (recipientId || userContext.businessId) 
    : undefined;
  const targetManufacturerId = recipientType === 'manufacturer' 
    ? (recipientId || userContext.manufacturerId) 
    : undefined;

  // Create notification through service
  const notification = await notificationService.createNotification({
    businessId: targetBusinessId,
    manufacturerId: targetManufacturerId,
    type,
    message,
    data: {
      category,
      title,
      priority: priority || 'medium',
      actionUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      ...data
    }
  });

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: {
      notification,
      createdAt: new Date().toISOString()
    }
  });
});


/**
 * Clean up old notifications (maintenance endpoint)
 * DELETE /api/notifications/cleanup
 * 
 * @requires authentication
 * @optional query: { daysToKeep?: number }
 * @returns { cleaned, summary }
 */
export const cleanupOldNotifications = asyncHandler(async (
  req: (AuthRequest | ManufacturerAuthRequest) & { 
    query: { daysToKeep?: string } 
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const daysToKeep = parseInt(req.query.daysToKeep || '90');

  if (daysToKeep < 1 || daysToKeep > 365) {
    throw createAppError('Days to keep must be between 1 and 365', 400, 'INVALID_DAYS_TO_KEEP');
  }

  // Use service cleanup method
  const result = await notificationService.cleanupOldNotifications(daysToKeep);

  // Return cleanup summary
  res.json({
    success: true,
    message: `${result.deleted} old notifications cleaned up`,
    data: {
      deleted: result.deleted,
      daysToKeep,
      cutoffDate: new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString(),
      cleanedAt: new Date().toISOString()
    }
  });
});

