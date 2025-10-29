// src/controllers/features/notifications/notificationsInbox.controller.ts
// Controller providing inbox-oriented notification endpoints backed by modular services

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';
import {
  NotificationFilters,
  NotificationRecipient,
} from '../../../services/notifications';

interface ListNotificationsRequest extends BaseRequest {
  validatedQuery?: {
    type?: string;
    category?: string;
    priority?: string;
    read?: boolean;
    page?: number;
    limit?: number;
    dateFrom?: string | Date;
    dateTo?: string | Date;
  };
}

interface NotificationParamsRequest extends BaseRequest {
  validatedParams: {
    id: string;
  };
}

interface BulkNotificationsRequest extends BaseRequest {
  validatedBody: {
    notificationIds: string[];
  };
}

interface CreateNotificationRequest extends BaseRequest {
  validatedBody: {
    businessId?: string;
    manufacturerId?: string;
    type: string;
    message: string;
    category?: string;
    priority?: string;
    title?: string;
    actionUrl?: string;
    data?: Record<string, unknown>;
    templateId?: string;
    templateData?: Record<string, unknown>;
  };
}

interface NotificationsByTypeRequest extends BaseRequest {
  validatedParams: {
    type: string;
  };
  validatedQuery?: {
    limit?: number;
  };
}

/**
 * NotificationsInboxController exposes inbox management operations
 * such as listing, reading, deleting, and creating notifications.
 */
export class NotificationsInboxController extends NotificationsBaseController {
  private inboxService = this.notificationsServices.features.inboxService;

  /**
   * List notifications for the authenticated recipient with optional filters.
   */
  async listNotifications(req: ListNotificationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);
      const { filters, page, limit } = this.buildFilters(req);

      this.recordPerformance(req, 'LIST_NOTIFICATIONS');

      const result = await this.inboxService.listNotifications(recipient, filters);
      const pagination = this.createPaginationMeta(page, limit, result.total);

      this.logAction(req, 'LIST_NOTIFICATIONS_SUCCESS', {
        recipient,
        filter: { ...filters, limit, offset: filters.offset },
        total: result.total,
        unread: result.unread,
      });

      return {
        notifications: result.notifications,
        stats: {
          total: result.total,
          unread: result.unread,
        },
        pagination,
      };
    }, res, 'Notifications retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve unread notifications for the current recipient.
   */
  async getUnreadNotifications(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'GET_UNREAD_NOTIFICATIONS');

      const unread = await this.inboxService.getUnreadNotifications(recipient);

      this.logAction(req, 'GET_UNREAD_NOTIFICATIONS_SUCCESS', {
        recipient,
        unreadCount: unread.length,
      });

      return { notifications: unread };
    }, res, 'Unread notifications retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve a single notification by identifier.
   */
  async getNotification(req: NotificationParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'GET_NOTIFICATION');

      const notification = await this.inboxService.getNotificationById(req.validatedParams.id, recipient);

      this.logAction(req, 'GET_NOTIFICATION_SUCCESS', {
        recipient,
        notificationId: req.validatedParams.id,
      });

      return { notification };
    }, res, 'Notification retrieved', this.getRequestMeta(req));
  }

  /**
   * Mark a notification as read for the recipient.
   */
  async markNotificationAsRead(req: NotificationParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'MARK_NOTIFICATION_AS_READ');

      const notification = await this.inboxService.markAsRead(req.validatedParams.id, recipient);

      this.logAction(req, 'MARK_NOTIFICATION_AS_READ_SUCCESS', {
        recipient,
        notificationId: req.validatedParams.id,
      });

      return { notification };
    }, res, 'Notification marked as read', this.getRequestMeta(req));
  }

  /**
   * Mark all notifications as read for the recipient.
   */
  async markAllAsRead(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'MARK_ALL_NOTIFICATIONS_AS_READ');

      const result = await this.inboxService.markAllAsRead(recipient);

      this.logAction(req, 'MARK_ALL_NOTIFICATIONS_AS_READ_SUCCESS', {
        recipient,
        modified: result.modified,
      });

      return {
        modified: result.modified,
      };
    }, res, 'All notifications marked as read', this.getRequestMeta(req));
  }

  /**
   * Delete a single notification for the recipient.
   */
  async deleteNotification(req: NotificationParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);

      this.recordPerformance(req, 'DELETE_NOTIFICATION');

      await this.inboxService.deleteNotification(req.validatedParams.id, recipient);

      this.logAction(req, 'DELETE_NOTIFICATION_SUCCESS', {
        recipient,
        notificationId: req.validatedParams.id,
      });

      return { deleted: true };
    }, res, 'Notification deleted', this.getRequestMeta(req));
  }

  /**
   * Delete multiple notifications for the recipient.
   */
  async bulkDeleteNotifications(req: BulkNotificationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);
      const { notificationIds } = req.validatedBody;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw { statusCode: 400, message: 'At least one notification ID is required' };
      }

      this.recordPerformance(req, 'BULK_DELETE_NOTIFICATIONS');

      const result = await this.inboxService.bulkDeleteNotifications(notificationIds, recipient);

      this.logAction(req, 'BULK_DELETE_NOTIFICATIONS_SUCCESS', {
        recipient,
        notificationIds,
        deleted: result.deleted,
      });

      return { deleted: result.deleted };
    }, res, 'Notifications deleted', this.getRequestMeta(req));
  }

  /**
   * Retrieve notifications filtered by type for the recipient.
   */
  async getNotificationsByType(req: NotificationsByTypeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req);
      const limit = this.sanitizeLimit(req.validatedQuery?.limit);

      this.recordPerformance(req, 'GET_NOTIFICATIONS_BY_TYPE');

      const notifications = await this.inboxService.getNotificationsByType(
        req.validatedParams.type,
        recipient,
        limit,
      );

      this.logAction(req, 'GET_NOTIFICATIONS_BY_TYPE_SUCCESS', {
        recipient,
        type: req.validatedParams.type,
        limit,
        count: notifications.length,
      });

      return { notifications };
    }, res, 'Notifications by type retrieved', this.getRequestMeta(req));
  }

  /**
   * Create a notification for a specific recipient.
   */
  async createNotification(req: CreateNotificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const recipient = this.resolveRecipient(req, { allowExplicit: true });
      const payload = this.buildCreatePayload(req, recipient);

      this.recordPerformance(req, 'CREATE_NOTIFICATION');

      const notification = await this.inboxService.createNotification(payload);

      this.logAction(req, 'CREATE_NOTIFICATION_SUCCESS', {
        recipient: payload.businessId ? { businessId: payload.businessId } : { manufacturerId: payload.manufacturerId },
        type: payload.type,
      });

      return { notification };
    }, res, 'Notification created', this.getRequestMeta(req));
  }

  private buildFilters(req: ListNotificationsRequest): { filters: NotificationFilters; page: number; limit: number } {
    const page = Math.max(1, Number(req.validatedQuery?.page ?? 1));
    const rawLimit = Number(req.validatedQuery?.limit ?? 20);
    const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit));

    const filters: NotificationFilters = {
      type: req.validatedQuery?.type,
      category: req.validatedQuery?.category,
      priority: req.validatedQuery?.priority,
      read: typeof req.validatedQuery?.read === 'boolean' ? req.validatedQuery?.read : undefined,
      limit,
      offset: (page - 1) * limit,
    };

    const dateFrom = this.parseDate(req.validatedQuery?.dateFrom);
    const dateTo = this.parseDate(req.validatedQuery?.dateTo);

    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }

    if (dateTo) {
      filters.dateTo = dateTo;
    }

    return { filters, page, limit };
  }

  private buildCreatePayload(req: CreateNotificationRequest, recipient: NotificationRecipient) {
    const { type, message, category, priority, title, actionUrl, data, templateId, templateData } = req.validatedBody;

    return {
      businessId: req.validatedBody.businessId ?? recipient.businessId,
      manufacturerId: req.validatedBody.manufacturerId ?? recipient.manufacturerId,
      type,
      message,
      category,
      priority,
      title,
      actionUrl,
      data,
      templateId,
      templateData,
    };
  }
}

export const notificationsInboxController = new NotificationsInboxController();
