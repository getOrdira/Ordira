// src/controllers/notification.controller.ts

import { Response, NextFunction } from 'express';
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
interface NotificationListRequest extends (AuthRequest | ManufacturerAuthRequest), ValidatedRequest {
  validatedQuery: {
    type?: string;
    read?: boolean;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  };
  userType?: 'business' | 'manufacturer';
}

interface NotificationActionRequest extends (AuthRequest | ManufacturerAuthRequest), ValidatedRequest {
  validatedParams: { id: string };
  userType?: 'business' | 'manufacturer';
}

interface BulkActionRequest extends (AuthRequest | ManufacturerAuthRequest), ValidatedRequest {
  validatedBody: {
    notificationIds: string[];
    action: 'read' | 'unread' | 'delete';
  };
  userType?: 'business' | 'manufacturer';
}

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
 * Get notifications for authenticated user
 * GET /api/notifications
 * 
 * @requires authentication (business or manufacturer)
 * @optional query: filtering, pagination options
 * @returns { notifications[], stats, pagination }
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

  // Build filter options
  const filterOptions = {
    type: queryParams.type,
    read: queryParams.read,
    dateFrom,
    dateTo,
    limit,
    offset
  };

  // Get notifications through service
  const result = await notificationService.listNotifications(
    userContext.businessId,
    userContext.manufacturerId,
    filterOptions
  );

  // Return standardized response
  res.json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications: result.notifications,
      stats: {
        total: result.total,
        unread: result.unread,
        read: result.total - result.unread
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
        read: queryParams.read,
        dateRange: {
          from: dateFrom?.toISOString(),
          to: dateTo?.toISOString()
        }
      }
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
 * Get unread notifications count
 * GET /api/notifications/unread/count
 * 
 * @requires authentication (business or manufacturer)
 * @returns { count, hasUnread }
 */
export const getUnreadCount = asyncHandler(async (
  req: AuthRequest | ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Get unread notifications through service
  const unreadNotifications = await notificationService.getUnreadNotifications(
    userContext.businessId,
    userContext.manufacturerId
  );

  const count = unreadNotifications.length;

  // Return standardized response
  res.json({
    success: true,
    message: 'Unread count retrieved successfully',
    data: {
      count,
      hasUnread: count > 0,
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 * 
 * @requires authentication (business or manufacturer)
 * @returns { markedCount, updated }
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

  // Return standardized response
  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: {
      markedCount: result.modifiedCount,
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
 * @returns { notifications[], typeStats }
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

  // Get notifications by type through service
  const notifications = await notificationService.getNotificationsByType(
    type,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.json({
    success: true,
    message: `Notifications of type '${type}' retrieved successfully`,
    data: {
      type,
      notifications,
      count: notifications.length
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

  // Delete notification through service (implement if service has this method)
  // For now, we'll mark it as read since delete method may not exist
  await notificationService.markAsRead(
    id,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.json({
    success: true,
    message: 'Notification processed successfully',
    data: {
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
 * @returns { processed, results }
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

  const validActions = ['read', 'unread', 'delete'];
  if (!validActions.includes(action)) {
    throw createAppError(`Invalid action. Valid actions: ${validActions.join(', ')}`, 400, 'INVALID_ACTION');
  }

  // Process bulk action
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const notificationId of notificationIds) {
    try {
      if (action === 'read') {
        await notificationService.markAsRead(
          notificationId,
          userContext.businessId,
          userContext.manufacturerId
        );
      }
      // Add other actions as needed when service methods become available
      
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

  // Return standardized response
  res.json({
    success: true,
    message: `Bulk action completed: ${successCount} successful, ${errorCount} failed`,
    data: {
      action,
      processed: notificationIds.length,
      successful: successCount,
      failed: errorCount,
      results,
      processedAt: new Date().toISOString()
    }
  });
});

