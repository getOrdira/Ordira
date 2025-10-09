import { NotificationRecipient } from './notificationRecipient';
import { NotificationEventType } from './notificationEventType';
import { NotificationCategory } from './notificationCategory';
import { NotificationPriority } from './notificationPriority';

export interface NotificationEventMetadata {
  category: NotificationCategory;
  priority?: NotificationPriority;
  title?: string;
  message?: string;
  actionUrl?: string;
  templateKey?: string;
  channels?: { email?: boolean; webhook?: boolean; inApp?: boolean };
}

export interface NotificationEvent {
  type: NotificationEventType;
  recipient: NotificationRecipient;
  payload: Record<string, unknown>;
  metadata?: NotificationEventMetadata;
}
