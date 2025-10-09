import { NotificationCategory } from '../types/notificationCategory';
import { NotificationPriority } from '../types/notificationPriority';

export interface TemplateOutput {
  email?: {
    subject: string;
    text: string;
    html?: string;
  };
  webhook?: Record<string, unknown>;
  inApp?: {
    message: string;
    actionUrl?: string;
  };
  metadata?: {
    category?: NotificationCategory;
    priority?: NotificationPriority;
    title?: string;
    actionUrl?: string;
    templateKey?: string;
    channels?: { email?: boolean; webhook?: boolean; inApp?: boolean };
  };
}
