import { notificationDataService } from '../core/notificationData.service';
import { NotificationRecipient, NotificationStats } from '../types';

export class AnalyticsService {
  async getStats(recipient: NotificationRecipient): Promise<NotificationStats> {
    return notificationDataService.getStats(recipient);
  }
}

export const analyticsService = new AnalyticsService();
