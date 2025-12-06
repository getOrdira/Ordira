import { Notification, INotification } from '../../../models/infrastructure/notification.model';
import { logger } from '../../../utils/logger';

export class DigestDataService {
  /**
   * Find pending digests for batching.
   * Note: The Notification model doesn't currently have deliveryFrequency or scheduledAt fields.
   * This implementation returns notifications that are unread and older than 1 hour
   * as candidates for digest processing. In a full implementation, these fields would
   * be added to the model or preferences would be checked per recipient.
   */
  async findPendingDigests(referenceDate: Date): Promise<INotification[]> {
    try {
      // Find unread notifications that are older than 1 hour (candidates for digest)
      // In a production system, this would check user preferences for digest frequency
      const oneHourAgo = new Date(referenceDate.getTime() - 60 * 60 * 1000);
      
      return Notification.find({
        read: false,
        createdAt: { $lte: oneHourAgo },
        deletedAt: { $exists: false }
      })
        .sort({ createdAt: 1 })
        .limit(100) // Limit to prevent processing too many at once
        .lean();
    } catch (error) {
      logger.error('Error finding pending digests', { error, referenceDate });
      // Return empty array on error to prevent cascading failures
      return [];
    }
  }
}

export const digestDataService = new DigestDataService();

