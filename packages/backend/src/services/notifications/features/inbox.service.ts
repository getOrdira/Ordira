import { notificationDataService } from '../core/notificationData.service';
import { notificationMapper } from '../utils/mapper';
import { NotificationFilters, NotificationRecipient, NotificationSummary } from '../types';

export class InboxService {
  private requireRecipient(recipient: NotificationRecipient): void {
    if (!recipient.businessId && !recipient.manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }
  }

  async listNotifications(recipient: NotificationRecipient, filters: NotificationFilters = {}): Promise<{ notifications: NotificationSummary[]; total: number; unread: number; }> {
    this.requireRecipient(recipient);
    const result = await notificationDataService.listForRecipient(recipient, filters);
    return {
      notifications: result.items.map(notificationMapper.toSummary),
      total: result.total,
      unread: result.unread
    };
  }

  async getUnreadNotifications(recipient: NotificationRecipient): Promise<NotificationSummary[]> {
    const result = await this.listNotifications(recipient, { read: false });
    return result.notifications;
  }

  async markAsRead(notificationId: string, recipient: NotificationRecipient): Promise<NotificationSummary> {
    const updated = await notificationDataService.markAsReadForRecipient(notificationId, recipient);
    if (!updated) {
      throw { statusCode: 404, message: 'Notification not found' };
    }
    return notificationMapper.toSummary(updated as any);
  }

  async markAllAsRead(recipient: NotificationRecipient): Promise<{ modified: number }> {
    const modified = await notificationDataService.markAllAsRead(recipient);
    return { modified };
  }

  async deleteNotification(notificationId: string, recipient: NotificationRecipient): Promise<void> {
    const deleted = await notificationDataService.deleteForRecipient(notificationId, recipient);
    if (!deleted) {
      throw { statusCode: 404, message: 'Notification not found' };
    }
  }

  async bulkDeleteNotifications(notificationIds: string[], recipient: NotificationRecipient): Promise<{ deleted: number }> {
    const deleted = await notificationDataService.deleteManyForRecipient(notificationIds, recipient);
    return { deleted };
  }

  async getNotificationById(notificationId: string, recipient: NotificationRecipient): Promise<NotificationSummary> {
    const notification = await notificationDataService.getByIdForRecipient(notificationId, recipient);
    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found' };
    }
    return notificationMapper.toSummary(notification as any);
  }

  async getNotificationsByType(type: string, recipient: NotificationRecipient, limit: number = 20): Promise<NotificationSummary[]> {
    const notifications = await notificationDataService.getByType(recipient, type, limit);
    return notifications.map(notificationMapper.toSummary);
  }

  async createNotification(data: { businessId?: string; manufacturerId?: string; type: string; message: string; data?: Record<string, unknown>; }): Promise<NotificationSummary> {
    const notification = await notificationDataService.createNotification(data);
    return notificationMapper.toSummary(notification as any);
  }
}

export const inboxService = new InboxService();
