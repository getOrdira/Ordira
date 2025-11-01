import { FilterQuery } from 'mongoose';
import { Notification, INotification } from '../../../models/deprecated/notification.model';
import { logger } from '../../../utils/logger';
import { NotificationFilters, NotificationRecipient } from '../types';
import { buildNotificationQuery, buildUserQuery } from '../utils/queryBuilder';

interface ListResult {
  items: INotification[];
  total: number;
  unread: number;
}

const ensureRecipient = (recipient: NotificationRecipient): void => {
  if (!recipient.businessId && !recipient.manufacturerId) {
    throw new Error('Either businessId or manufacturerId must be provided');
  }
};

export class NotificationDataService {
  async listForRecipient(recipient: NotificationRecipient, filters: NotificationFilters = {}): Promise<ListResult> {
    ensureRecipient(recipient);

    const queryFilters: NotificationFilters = {
      ...filters,
      businessId: recipient.businessId,
      manufacturerId: recipient.manufacturerId
    };

    const query = buildNotificationQuery(queryFilters);
    const limit = filters.limit ?? 50;
    const skip = filters.offset ?? 0;

    const [items, total, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, read: false })
    ]);

    return { items, total, unread };
  }

  async getByIdForRecipient(notificationId: string, recipient: NotificationRecipient): Promise<INotification | null> {
    ensureRecipient(recipient);
    const userQuery = buildUserQuery(recipient.businessId, recipient.manufacturerId);
    return Notification.findOne({ _id: notificationId, ...userQuery });
  }

  async markAsReadForRecipient(notificationId: string, recipient: NotificationRecipient): Promise<INotification | null> {
    ensureRecipient(recipient);
    const userQuery = buildUserQuery(recipient.businessId, recipient.manufacturerId);
    return Notification.findOneAndUpdate(
      { _id: notificationId, ...userQuery },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
  }

  async markAllAsRead(recipient: NotificationRecipient): Promise<number> {
    ensureRecipient(recipient);
    const userQuery = buildUserQuery(recipient.businessId, recipient.manufacturerId);
    const result = await Notification.updateMany({ ...userQuery, read: false }, { $set: { read: true, readAt: new Date() } });
    return result.modifiedCount;
  }

  async deleteForRecipient(notificationId: string, recipient: NotificationRecipient): Promise<number> {
    ensureRecipient(recipient);
    const userQuery = buildUserQuery(recipient.businessId, recipient.manufacturerId);
    const result = await Notification.deleteOne({ _id: notificationId, ...userQuery });
    return result.deletedCount || 0;
  }

  async deleteManyForRecipient(notificationIds: string[], recipient: NotificationRecipient): Promise<number> {
    ensureRecipient(recipient);
    const userQuery = buildUserQuery(recipient.businessId, recipient.manufacturerId);
    const result = await Notification.deleteMany({ _id: { $in: notificationIds }, ...userQuery });
    return result.deletedCount || 0;
  }

  async getByType(recipient: NotificationRecipient, type: string, limit: number = 20): Promise<INotification[]> {
    ensureRecipient(recipient);
    const result = await this.listForRecipient(recipient, { type, limit });
    return result.items;
  }

  async createNotification(data: {
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
  }): Promise<INotification> {
    const notification: FilterQuery<INotification> = {
      type: data.type,
      message: data.message,
      data: data.data,
      category: data.category || 'system',
      priority: (data.priority as any) || 'medium',
      title: data.title,
      actionUrl: data.actionUrl,
      templateId: data.templateId,
      templateData: data.templateData,
      read: false
    } as FilterQuery<INotification>;

    if (data.businessId) {
      notification.business = data.businessId;
    }

    if (data.manufacturerId) {
      notification.manufacturer = data.manufacturerId;
    }

    const created = await Notification.create(notification);
    return created.toObject();
  }

  async cleanupOlderThan(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({ createdAt: { $lt: cutoffDate }, read: true });
    if (result.deletedCount) {
      logger.info('Cleaned up old notifications', { count: result.deletedCount });
    }
    return result.deletedCount || 0;
  }

  async getStats(recipient: NotificationRecipient): Promise<{ total: number; unread: number; byType: Record<string, number>; recent: number; }> {
    ensureRecipient(recipient);
    const userQuery = buildUserQuery(recipient.businessId, recipient.manufacturerId);

    const [totalStats, typeStats] = await Promise.all([
      Notification.aggregate([
        { $match: userQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } }
          }
        }
      ]),
      Notification.aggregate([
        { $match: userQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await Notification.countDocuments({ ...userQuery, createdAt: { $gte: weekAgo } });

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byType[stat._id] = stat.count;
    });

    return {
      total: totalStats[0]?.total || 0,
      unread: totalStats[0]?.unread || 0,
      byType,
      recent
    };
  }
}

export const notificationDataService = new NotificationDataService();
