import { INotification } from '../../../models/deprecated/notification.model';
import { NotificationSummary } from '../types';

export class NotificationMapper {
  toSummary(notification: INotification): NotificationSummary {
    return {
      id: notification._id.toString(),
      type: notification.type,
      message: notification.message,
      data: notification.data as Record<string, unknown> | undefined,
      read: notification.read,
      createdAt: notification.createdAt,
      category: notification.category as any,
      priority: notification.priority as any,
      title: notification.title,
      actionUrl: notification.actionUrl,
    };
  }
}

export const notificationMapper = new NotificationMapper();
