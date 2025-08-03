// src/services/notificationStore.service.ts
import { Notification, INotification } from '../models/notification.model';

export async function listNotifications(
  businessId?: string,
  manufacturerId?: string
): Promise<INotification[]> {
  const filter: any = {};
  if (businessId)     filter.business     = businessId;
  if (manufacturerId) filter.manufacturer = manufacturerId;
  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .lean();
}

export async function markAsRead(
  id: string,
  businessId?: string,
  manufacturerId?: string
): Promise<void> {
  const filter: any = { _id: id };
  if (businessId)     filter.business     = businessId;
  if (manufacturerId) filter.manufacturer = manufacturerId;
  await Notification.findOneAndUpdate(filter, { read: true });
}
