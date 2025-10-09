import { Notification, INotification } from '../../../models/notification.model';

export class DigestDataService {
  async findPendingDigests(referenceDate: Date): Promise<INotification[]> {
    return Notification.find({
      deliveryFrequency: { $in: ['daily', 'weekly'] },
      scheduledAt: { $lte: referenceDate },
      read: false
    })
      .sort({ scheduledAt: 1 })
      .lean();
  }
}

export const digestDataService = new DigestDataService();
