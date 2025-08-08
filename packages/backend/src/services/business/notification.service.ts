// src/services/business/notification.service.ts
import { Notification, INotification } from '../../models/notification.model';
import { Types } from 'mongoose';

export interface NotificationSummary {
  id: string;
  type: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  recent: number;
}

export interface NotificationFilters {
  type?: string;
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Business service for managing in-app notifications
 * Handles notification storage, retrieval, and management logic
 */
export class NotificationService {

  /**
   * List notifications for a user (brand or manufacturer)
   */
  async listNotifications(
    businessId?: string,
    manufacturerId?: string,
    filters: NotificationFilters = {}
  ): Promise<{
    notifications: NotificationSummary[];
    total: number;
    unread: number;
  }> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const query = this.buildNotificationQuery(businessId, manufacturerId, filters);
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [notifications, total, unread] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        ...this.buildUserQuery(businessId, manufacturerId),
        read: false
      })
    ]);

    return {
      notifications: notifications.map(this.mapToSummary),
      total,
      unread
    };
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationSummary[]> {
    const result = await this.listNotifications(businessId, manufacturerId, { read: false });
    return result.notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationSummary> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        ...userQuery
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found' };
    }

    return this.mapToSummary(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ modified: number }> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const result = await Notification.updateMany(
      {
        ...userQuery,
        read: false
      },
      { read: true }
    );

    return { modified: result.modifiedCount };
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<void> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      ...userQuery
    });

    if (!result) {
      throw { statusCode: 404, message: 'Notification not found' };
    }
  }

  /**
   * Bulk delete notifications
   */
  async bulkDeleteNotifications(
    notificationIds: string[],
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ deleted: number }> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      ...userQuery
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationStats> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
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

    // Count recent notifications (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await Notification.countDocuments({
      ...userQuery,
      createdAt: { $gte: weekAgo }
    });

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

  /**
   * Get notification by ID
   */
  async getNotificationById(
    notificationId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<NotificationSummary> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const userQuery = this.buildUserQuery(businessId, manufacturerId);
    
    const notification = await Notification.findOne({
      _id: notificationId,
      ...userQuery
    });

    if (!notification) {
      throw { statusCode: 404, message: 'Notification not found' };
    }

    return this.mapToSummary(notification);
  }

  /**
   * Clean up old notifications (for maintenance)
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<{ deleted: number }> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true // Only delete read notifications
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(
    type: string,
    businessId?: string,
    manufacturerId?: string,
    limit: number = 20
  ): Promise<NotificationSummary[]> {
    const result = await this.listNotifications(businessId, manufacturerId, {
      type,
      limit
    });
    
    return result.notifications;
  }

  /**
   * Create a custom notification (for admin use)
   */
  async createNotification(data: {
    businessId?: string;
    manufacturerId?: string;
    type: string;
    message: string;
    data?: any;
  }): Promise<NotificationSummary> {
    const notificationData: any = {
      type: data.type,
      message: data.message,
      data: data.data,
      read: false
    };

    if (data.businessId) {
      notificationData.business = data.businessId;
    }
    
    if (data.manufacturerId) {
      notificationData.manufacturer = data.manufacturerId;
    }

    const notification = await Notification.create(notificationData);
    return this.mapToSummary(notification);
  }

  /**
   * Helper methods
   */
  private buildUserQuery(businessId?: string, manufacturerId?: string): any {
    const query: any = {};
    
    if (businessId && manufacturerId) {
      query.$or = [
        { business: new Types.ObjectId(businessId) },
        { manufacturer: new Types.ObjectId(manufacturerId) }
      ];
    } else if (businessId) {
      query.business = new Types.ObjectId(businessId);
    } else if (manufacturerId) {
      query.manufacturer = new Types.ObjectId(manufacturerId);
    }

    return query;
  }

  private buildNotificationQuery(
    businessId?: string,
    manufacturerId?: string,
    filters: NotificationFilters = {}
  ): any {
    const query = this.buildUserQuery(businessId, manufacturerId);

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.read !== undefined) {
      query.read = filters.read;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    return query;
  }

  private mapToSummary(notification: INotification): NotificationSummary {
    return {
      id: notification._id.toString(),
      type: notification.type,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt
    };
  }
}
