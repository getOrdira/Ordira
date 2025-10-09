import { digestDataService } from '../core/digestData.service';
import { deliveryService } from './delivery.service';
import { NotificationEvent, NotificationEventType, NotificationCategory } from '../types';

export class BatchingService {
  async processDigests(reference: Date): Promise<void> {
    const pending = await digestDataService.findPendingDigests(reference);
    for (const notification of pending) {
      const event: NotificationEvent = {
        type: notification.type as NotificationEventType,
        recipient: {
          businessId: notification.business?.toString(),
          manufacturerId: notification.manufacturer?.toString(),
          email: undefined,
          webhookUrl: undefined
        },
        payload: notification.data || {},
        metadata: {
          category: (notification.category as NotificationCategory) || NotificationCategory.System,
          channels: { email: true, webhook: false, inApp: true },
        }
      };
      await deliveryService.deliver(event);
    }
  }
}

export const batchingService = new BatchingService();
