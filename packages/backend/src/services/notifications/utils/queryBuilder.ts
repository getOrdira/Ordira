import { FilterQuery, Types } from 'mongoose';
import { INotification } from '../../../models/notification.model';
import { NotificationFilters } from '../types/notificationFilters';

export const buildUserQuery = (businessId?: string, manufacturerId?: string): FilterQuery<INotification> => {
  if (!businessId && !manufacturerId) {
    throw new Error('Either businessId or manufacturerId must be provided');
  }

  if (businessId && manufacturerId) {
    return {
      $or: [
        { business: new Types.ObjectId(businessId) },
        { manufacturer: new Types.ObjectId(manufacturerId) }
      ]
    } as FilterQuery<INotification>;
  }

  if (businessId) {
    return { business: new Types.ObjectId(businessId) } as FilterQuery<INotification>;
  }

  return { manufacturer: new Types.ObjectId(manufacturerId!) } as FilterQuery<INotification>;
};

export const buildNotificationQuery = (filters: NotificationFilters): FilterQuery<INotification> => {
  const query: FilterQuery<INotification> = {};

  if (filters.businessId || filters.manufacturerId) {
    Object.assign(query, buildUserQuery(filters.businessId, filters.manufacturerId));
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.read !== undefined) {
    query.read = filters.read;
  }

  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {} as any;
    if (filters.dateFrom) {
      query.createdAt.$gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      query.createdAt.$lte = filters.dateTo;
    }
  }

  return query;
};
