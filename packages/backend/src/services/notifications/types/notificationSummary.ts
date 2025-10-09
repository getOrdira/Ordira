import { NotificationCategory } from './notificationCategory';
import { NotificationPriority } from './notificationPriority';

export interface NotificationSummary {
  id: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  title?: string;
  actionUrl?: string;
}
