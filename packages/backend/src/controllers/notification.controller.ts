// src/controllers/notification.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { getNotificationsServices } from '../services/container.service';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationEventType,
  NotificationRecipient,
  NotificationSummary,
  NotificationFilters,
  NotificationEvent,
} from '../services/notifications';

const notificationsServices = getNotificationsServices();
const {
  core: { notificationDataService },
  features: { inboxService, analyticsService, maintenanceService, preferencesService },
  workflows: { eventHandlerService },
} = notificationsServices;

const CATEGORY_UI: Record<string, { icon: string; label: string; href: string }> = {
  [NotificationCategory.System]: { icon: 'bell', label: 'View notification', href: '/dashboard/notifications' },
  [NotificationCategory.Billing]: { icon: 'credit-card', label: 'Manage billing', href: '/brand/billing' },
  [NotificationCategory.Certificate]: { icon: 'badge-check', label: 'View certificates', href: '/brand/certificates' },
  [NotificationCategory.Connection]: { icon: 'users', label: 'Manage connections', href: '/brand/connections' },
  [NotificationCategory.Security]: { icon: 'shield-check', label: 'Review security alert', href: '/settings/security' },
  [NotificationCategory.Account]: { icon: 'user-circle', label: 'Manage account', href: '/settings/profile' },
  vote: { icon: 'check-circle', label: 'Review votes', href: '/brand/votes' },
  invite: { icon: 'user-plus', label: 'Manage invites', href: '/brand/invitations' },
  order: { icon: 'shopping-cart', label: 'Review orders', href: '/brand/orders' },
};

const DEFAULT_UI = CATEGORY_UI[NotificationCategory.System];

interface BaseNotificationQuery {
  validatedQuery: {
    type?: string;
    category?: NotificationCategory | string;
    priority?: NotificationPriority;
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

type NotificationListRequest = (UnifiedAuthRequest | UnifiedAuthRequest) & ValidatedRequest & BaseNotificationQuery;

interface BaseNotificationAction {
  validatedParams: { id: string };
  userType?: 'business' | 'manufacturer';
}

type NotificationActionRequest = (UnifiedAuthRequest | UnifiedAuthRequest) & ValidatedRequest & BaseNotificationAction;

interface BaseBulkAction {
  validatedBody: {
    notificationIds: string[];
    action: 'read' | 'unread' | 'delete' | 'archive';
  };
  userType?: 'business' | 'manufacturer';
}

type BulkActionRequest = (UnifiedAuthRequest | UnifiedAuthRequest) & ValidatedRequest & BaseBulkAction;

interface BaseCreateNotification {
  validatedBody: {
    recipientId?: string;
    recipientType?: 'business' | 'manufacturer';
    type: string;
    category: NotificationCategory | string;
    title?: string;
    message: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    expiresAt?: string;
    data?: Record<string, unknown>;
  };
}

type CreateNotificationRequest = (UnifiedAuthRequest | UnifiedAuthRequest) & ValidatedRequest & BaseCreateNotification;

interface DecoratedNotification extends NotificationSummary {
  icon: string;
  cta: {
    label: string;
    href?: string;
    isExternal?: boolean;
  };
  isNew: boolean;
  createdAtIso: string;
}

function getUserContext(req: UnifiedAuthRequest | UnifiedAuthRequest): {
  userId: string;
  userType: 'business' | 'manufacturer';
  businessId?: string;
  manufacturerId?: string;
} {
  if ('manufacturer' in req && req.manufacturer) {
    return {
      userId: req.userId!,
      userType: 'manufacturer',
      manufacturerId: req.userId!,
    };
  }

  return {
    userId: req.userId!,
    userType: 'business',
    businessId: req.userId!,
  };
}

const toRecipient = (context: { businessId?: string; manufacturerId?: string }): NotificationRecipient => ({
  businessId: context.businessId,
  manufacturerId: context.manufacturerId,
});

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
};

const parseDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const clampLimit = (limit?: number): number => {
  if (!limit || Number.isNaN(limit) || limit <= 0) {
    return 25;
  }
  return Math.min(limit, 100);
};

const decorateNotification = (summary: NotificationSummary): DecoratedNotification => {
  const category = summary.category ?? NotificationCategory.System;
  const ui = CATEGORY_UI[category] ?? DEFAULT_UI;
  const createdAt = summary.createdAt instanceof Date ? summary.createdAt : new Date(summary.createdAt);

  return {
    ...summary,
    icon: ui.icon,
    cta: {
      label: ui.label,
      href: summary.actionUrl ?? ui.href,
      isExternal: summary.actionUrl ? /^https?:\/\//i.test(summary.actionUrl) : false,
    },
    isNew: !summary.read && Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000,
    createdAtIso: createdAt.toISOString(),
  };
};

const groupByType = (notifications: NotificationSummary[]): Record<string, number> => {
  return notifications.reduce<Record<string, number>>((acc, notification) => {
    acc[notification.type] = (acc[notification.type] ?? 0) + 1;
    return acc;
  }, {});
};

const buildFilters = (
  query: BaseNotificationQuery['validatedQuery'],
  page: number,
  limit: number,
): NotificationFilters => ({
  type: query?.type,
  category: query?.category,
  priority: query?.priority,
  read: parseBoolean(query?.read),
  limit,
  offset: (page - 1) * limit,
  dateFrom: parseDate(query?.dateFrom),
  dateTo: parseDate(query?.dateTo),
});

const resolveEventType = (type: string): NotificationEventType | undefined => {
  return (Object.values(NotificationEventType) as string[]).includes(type)
    ? (type as NotificationEventType)
    : undefined;
};

export const getNotifications = asyncHandler(async (
  req: NotificationListRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);

  const page = req.validatedQuery?.page && req.validatedQuery.page > 0 ? req.validatedQuery.page : 1;
  const limit = clampLimit(req.validatedQuery?.limit);
  const filters = buildFilters(req.validatedQuery, page, limit);

  const [listResult, stats] = await Promise.all([
    inboxService.listNotifications(recipient, filters),
    analyticsService.getStats(recipient),
  ]);

  const notifications = listResult.notifications.map(decorateNotification);

  res.json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications,
      stats,
      pagination: {
        page,
        limit,
        total: listResult.total,
        totalPages: Math.max(1, Math.ceil(listResult.total / limit)),
      },
      filters: req.validatedQuery,
      fetchedAt: new Date().toISOString(),
    },
  });
});

export const getNotificationStats = asyncHandler(async (
  req: UnifiedAuthRequest | UnifiedAuthRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);

  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: 'Notification stats retrieved successfully',
    data: {
      stats,
      retrievedAt: new Date().toISOString(),
    },
  });
});

export const readNotification = asyncHandler(async (
  req: NotificationActionRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { id } = req.validatedParams;

  const updatedNotification = await inboxService.markAsRead(id, recipient);
  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: {
      notification: decorateNotification(updatedNotification),
      stats,
      updatedAt: new Date().toISOString(),
    },
  });
});

export const getNotificationDetails = asyncHandler(async (
  req: NotificationActionRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { id } = req.validatedParams;

  const notification = await inboxService.getNotificationById(id, recipient);
  const related = await inboxService.getNotificationsByType(notification.type, recipient, 5);

  res.json({
    success: true,
    message: 'Notification details retrieved successfully',
    data: {
      notification: decorateNotification(notification),
      relatedNotifications: related
        .filter((item) => item.id !== id)
        .map(decorateNotification),
      retrievedAt: new Date().toISOString(),
    },
  });
});

export const getUnreadCount = asyncHandler(async (
  req: UnifiedAuthRequest | UnifiedAuthRequest & { query?: { since?: string } },
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const since = typeof req.query?.since === 'string' ? parseDate(req.query.since) : undefined;

  const [unreadResult, latestResult, stats] = await Promise.all([
    inboxService.listNotifications(recipient, {
      read: false,
      limit: 50,
      dateFrom: since,
    }),
    inboxService.listNotifications(recipient, {
      limit: 10,
      dateFrom: since,
    }),
    analyticsService.getStats(recipient),
  ]);

  const unreadNotifications = unreadResult.notifications;
  const latestNotifications = latestResult.notifications.map(decorateNotification);
  const breakdownByType = groupByType(unreadNotifications);

  res.json({
    success: true,
    message: 'Unread notification insights retrieved successfully',
    data: {
      count: unreadResult.total,
      hasUnread: unreadResult.total > 0,
      breakdown: {
        byType: breakdownByType,
        urgent: unreadNotifications.filter((n) => n.priority === NotificationPriority.Urgent).length,
        high: unreadNotifications.filter((n) => n.priority === NotificationPriority.High).length,
        recent: unreadNotifications.filter((n) => new Date(n.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000).length,
      },
      percentage: stats.total > 0 ? Math.round((unreadResult.total / stats.total) * 100) : 0,
      latest: latestNotifications,
      since: since ? since.toISOString() : null,
      checkedAt: new Date().toISOString(),
    },
  });
});

export const markAllAsRead = asyncHandler(async (
  req: UnifiedAuthRequest | UnifiedAuthRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);

  const result = await inboxService.markAllAsRead(recipient);
  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: `${result.modified} notifications marked as read`,
    data: {
      markedCount: result.modified,
      remainingUnread: stats.unread,
      totalNotifications: stats.total,
      updatedAt: new Date().toISOString(),
    },
  });
});

export const getNotificationsByType = asyncHandler(async (
  req: (UnifiedAuthRequest | UnifiedAuthRequest) & { params: { type: string } },
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { type } = req.params;

  const notifications = await inboxService.getNotificationsByType(type, recipient, 50);
  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: 'Notifications retrieved by type successfully',
    data: {
      type,
      notifications: notifications.map(decorateNotification),
      stats,
      insights: {
        total: notifications.length,
        unread: notifications.filter((n) => !n.read).length,
        lastReceivedAt: notifications[0]?.createdAt ? new Date(notifications[0].createdAt).toISOString() : null,
      },
    },
  });
});

export const deleteNotification = asyncHandler(async (
  req: NotificationActionRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { id } = req.validatedParams;

  await inboxService.deleteNotification(id, recipient);
  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: 'Notification deleted successfully',
    data: {
      notificationId: id,
      deletedAt: new Date().toISOString(),
      stats,
    },
  });
});

export const bulkNotificationAction = asyncHandler(async (
  req: BulkActionRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { notificationIds, action } = req.validatedBody;

  if (!notificationIds?.length) {
    throw createAppError('At least one notification ID is required', 400, 'MISSING_NOTIFICATION_IDS');
  }

  if (notificationIds.length > 100) {
    throw createAppError('Maximum 100 notifications can be processed at once', 400, 'TOO_MANY_NOTIFICATIONS');
  }

  const validActions: Record<typeof action, true> = { read: true, unread: true, delete: true, archive: true } as const;
  if (!validActions[action]) {
    throw createAppError('Invalid bulk action supplied', 400, 'INVALID_ACTION');
  }

  const results: Array<{ id: string; status: 'success' | 'error'; action: typeof action; error?: string }> = [];

  for (const id of notificationIds) {
    try {
      switch (action) {
        case 'read':
          await inboxService.markAsRead(id, recipient);
          break;
        case 'delete':
          await inboxService.deleteNotification(id, recipient);
          break;
        case 'unread':
        case 'archive':
          throw new Error(`${action} action not yet implemented`);
      }

      results.push({ id, status: 'success', action });
    } catch (error: any) {
      results.push({
        id,
        status: 'error',
        action,
        error: error?.message ?? 'Unexpected error',
      });
    }
  }

  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: 'Bulk notification action processed',
    data: {
      processed: notificationIds.length,
      results,
      stats,
      completedAt: new Date().toISOString(),
    },
  });
});

export const bulkDeleteNotifications = asyncHandler(async (
  req: BulkActionRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { notificationIds } = req.validatedBody;

  if (!notificationIds?.length) {
    throw createAppError('At least one notification ID is required', 400, 'MISSING_NOTIFICATION_IDS');
  }

  const result = await inboxService.bulkDeleteNotifications(notificationIds, recipient);
  const stats = await analyticsService.getStats(recipient);

  res.json({
    success: true,
    message: `${result.deleted} notifications deleted successfully`,
    data: {
      deleted: result.deleted,
      requested: notificationIds.length,
      notFound: notificationIds.length - result.deleted,
      stats,
      deletedAt: new Date().toISOString(),
    },
  });
});

export const createNotification = asyncHandler(async (
  req: CreateNotificationRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const defaultRecipient = toRecipient(context);

  const {
    recipientId,
    recipientType,
    type,
    category,
    title,
    message,
    priority = NotificationPriority.Medium,
    actionUrl,
    expiresAt,
    data,
  } = req.validatedBody;

  const recipient: NotificationRecipient = {
    businessId: recipientType === 'business' ? recipientId ?? defaultRecipient.businessId : defaultRecipient.businessId,
    manufacturerId: recipientType === 'manufacturer' ? recipientId ?? defaultRecipient.manufacturerId : defaultRecipient.manufacturerId,
  };

  const eventType = resolveEventType(type);

  if (eventType) {
    const event: NotificationEvent = {
      type: eventType,
      recipient,
      payload: data ?? {},
      metadata: {
        category: (category as NotificationCategory) ?? NotificationCategory.System,
        priority,
        title,
        message,
        actionUrl,
      },
    };

    await eventHandlerService.handle(event);

    const { notifications } = await inboxService.listNotifications(recipient, { limit: 1 });
    const latest = notifications[0] ? decorateNotification(notifications[0]) : null;

    res.status(202).json({
      success: true,
      message: 'Notification event processed',
      data: {
        notification: latest,
        processedAt: new Date().toISOString(),
      },
    });
    return;
  }

  const created = await notificationDataService.createNotification({
    businessId: recipient.businessId,
    manufacturerId: recipient.manufacturerId,
    type,
    message,
    category: (category as NotificationCategory) ?? NotificationCategory.System,
    priority,
    title,
    actionUrl,
    data,
    templateData: data,
  });

  const summary = await inboxService.getNotificationById(created._id.toString(), recipient);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: {
      notification: decorateNotification(summary),
      createdAt: new Date().toISOString(),
    },
  });
});

export const cleanupOldNotifications = asyncHandler(async (
  req: (UnifiedAuthRequest | UnifiedAuthRequest) & { query: { daysToKeep?: string } },
  res: Response,
): Promise<void> => {
  const daysToKeep = parseInt(req.query.daysToKeep ?? '90', 10);

  if (Number.isNaN(daysToKeep) || daysToKeep < 1 || daysToKeep > 365) {
    throw createAppError('Days to keep must be between 1 and 365', 400, 'INVALID_DAYS_TO_KEEP');
  }

  const result = await maintenanceService.cleanupOldNotifications(daysToKeep);

  res.json({
    success: true,
    message: `${result.deleted} old notifications cleaned up`,
    data: {
      deleted: result.deleted,
      daysToKeep,
      cutoffDate: new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString(),
      cleanedAt: new Date().toISOString(),
    },
  });
});

// ====================
// NOTIFICATION PREFERENCES ENDPOINTS
// ====================

interface BasePreferencesRequest {
  validatedBody: {
    channel?: {
      email?: boolean;
      inApp?: boolean;
      webhook?: boolean;
    };
    categories?: Record<NotificationCategory, {
      email?: boolean;
      inApp?: boolean;
      webhook?: boolean;
    }>;
    frequency?: 'immediate' | 'daily' | 'weekly';
    timezone?: string;
  };
}

type UpdatePreferencesRequest = (UnifiedAuthRequest | UnifiedAuthRequest) & ValidatedRequest & BasePreferencesRequest;

export const getNotificationPreferences = asyncHandler(async (
  req: UnifiedAuthRequest | UnifiedAuthRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);

  const preferences = await preferencesService.resolve(recipient);

  res.json({
    success: true,
    message: 'Notification preferences retrieved successfully',
    data: {
      preferences,
      retrievedAt: new Date().toISOString(),
    },
  });
});

export const updateNotificationPreferences = asyncHandler(async (
  req: UpdatePreferencesRequest,
  res: Response,
): Promise<void> => {
  const context = getUserContext(req);
  const recipient = toRecipient(context);
  const { channel, categories, frequency, timezone } = req.validatedBody;

  const currentPreferences = await preferencesService.resolve(recipient);
  const updatedPreferences = {
    channel: { ...currentPreferences.channel, ...channel },
    categories: { ...categories },
    frequency: frequency || currentPreferences.frequency,
    timezone: timezone || currentPreferences.timezone,
  };

  await preferencesService.update(recipient, updatedPreferences);

  res.json({
    success: true,
    message: 'Notification preferences updated successfully',
    data: {
      preferences: updatedPreferences,
      updatedAt: new Date().toISOString(),
    },
  });
});


