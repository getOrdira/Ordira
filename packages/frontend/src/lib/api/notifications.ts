// src/lib/api/notifications.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

export interface Notification {
  _id: string;
  business: string; // Types.ObjectId as string
  type: 'vote_update' | 'transfer_success' | 'transfer_failed' | 'certificate_minted' | 'invitation_received' | 'invitation_accepted' | 'analytics_alert' | 'billing_update' | 'system'; // Assumed enums from model
  message: string;
  details?: any; // e.g., { voteId: string, productTitle: string } for context
  isRead: boolean;
  isEmailSent?: boolean; // If email notification was sent
  emailError?: string; // If email failed
  createdAt: Date;
  updatedAt: Date;
}

// Response interfaces matching backend structure
export interface NotificationListResponse {
  success: boolean;
  message: string;
  data: {
    notifications: Notification[];
    total: number;
    unread: number;
    pagination?: {
      page: number;
      limit: number;
      hasNext: boolean;
    };
  };
}

export interface NotificationDetailsResponse {
  success: boolean;
  message: string;
  data: {
    notification: Notification;
    relatedNotifications?: Notification[];
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
    hasUnread: boolean;
    breakdown: {
      [key: string]: number;
    };
  };
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[];
  };
  push: {
    enabled: boolean;
    types: string[];
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    };
  };
  sms: {
    enabled: boolean;
    types: string[];
  };
  inApp: {
    enabled: boolean;
    autoMarkAsRead: boolean;
    retentionDays: number;
  };
}

export interface BulkActionResponse {
  success: boolean;
  message: string;
  data: {
    processed: number;
    results: Array<{
      id: string;
      success: boolean;
      error?: string;
    }>;
    stats: {
      successful: number;
      failed: number;
    };
  };
}

/**
 * Fetches list of notifications with filtering and pagination.
 * @param params - Optional query parameters
 * @returns Promise<NotificationListResponse>
 */
export const getNotifications = async (params?: {
  unreadOnly?: boolean;
  type?: Notification['type'];
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'priority';
}): Promise<NotificationListResponse> => {
  try {
    const response = await apiClient.get<NotificationListResponse>('/api/notifications', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch notifications', error);
  }
};

/**
 * Fetches a single notification by ID with details.
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const getNotification = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.get<NotificationDetailsResponse>(`/api/notifications/${id}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch notification', error);
  }
};

/**
 * Fetches notifications by type.
 * @param type - Notification type
 * @returns Promise<NotificationListResponse>
 */
export const getNotificationsByType = async (type: string): Promise<NotificationListResponse> => {
  try {
    const response = await apiClient.get<NotificationListResponse>(`/api/notifications/type/${type}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch notifications by type', error);
  }
};

/**
 * Creates a new notification (admin/system use).
 * @param data - Notification creation data
 * @returns Promise<NotificationDetailsResponse>
 */
export const createNotification = async (data: {
  recipientId?: string;
  recipientType: 'business' | 'manufacturer';
  type: Notification['type'];
  category?: string;
  title?: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  expiresAt?: string;
  data?: any;
}): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.post<NotificationDetailsResponse>('/api/notifications', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to create notification', error);
  }
};

/**
 * Marks a notification as read.
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const markAsRead = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.put<NotificationDetailsResponse>(`/api/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to mark notification as read', error);
  }
};

/**
 * Marks all notifications as read.
 * @returns Promise<{ success: boolean; markedCount: number; stats: any }>
 */
export const markAllAsRead = async (): Promise<{ success: boolean; markedCount: number; stats: any }> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {markedCount: number; stats: any}}>('/api/notifications/read-all');
    return {
      success: response.data.success,
      markedCount: response.data.data.markedCount,
      stats: response.data.data.stats,
    };
  } catch (error) {
    throw new ApiError('Failed to mark all notifications as read', error);
  }
};

/**
 * Deletes a notification.
 * @param id - Notification ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteNotification = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: {deleted: boolean; notificationId: string}}>(`/api/notifications/${id}`);
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to delete notification', error);
  }
};

/**
 * Performs bulk actions on notifications.
 * @param notificationIds - Array of notification IDs
 * @param action - Action to perform ('read' | 'unread' | 'delete' | 'archive')
 * @returns Promise<BulkActionResponse>
 */
export const bulkNotificationAction = async (
  notificationIds: string[],
  action: 'read' | 'unread' | 'delete' | 'archive'
): Promise<BulkActionResponse> => {
  try {
    const response = await apiClient.post<BulkActionResponse>('/api/notifications/bulk', {
      notificationIds,
      action,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to perform bulk notification action', error);
  }
};

/**
 * Bulk deletes notifications.
 * @param notificationIds - Array of notification IDs to delete
 * @returns Promise<{ success: boolean; deleted: number; requested: number; notFound: number }>
 */
export const bulkDeleteNotifications = async (notificationIds: string[]): Promise<{ 
  success: boolean; 
  deleted: number; 
  requested: number; 
  notFound: number;
  updatedStats: { total: number; unread: number };
}> => {
  try {
    const response = await apiClient.delete<{
      success: boolean; 
      data: { 
        deleted: number; 
        requested: number; 
        notFound: number;
        updatedStats: { total: number; unread: number };
      }
    }>('/api/notifications/bulk', {
      data: { notificationIds },
    });
    return {
      success: response.data.success,
      ...response.data.data,
    };
  } catch (error) {
    throw new ApiError('Failed to bulk delete notifications', error);
  }
};

/**
 * Fetches unread notification count.
 * @returns Promise<UnreadCountResponse>
 */
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  try {
    const response = await apiClient.get<UnreadCountResponse>('/api/notifications/unread/count');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch unread count', error);
  }
};

/**
 * Gets notification settings.
 * @returns Promise<NotificationSettings>
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {settings: NotificationSettings}}>('/api/notifications/settings');
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to fetch notification settings', error);
  }
};

/**
 * Updates notification settings.
 * @param settings - Updated notification settings
 * @returns Promise<NotificationSettings>
 */
export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {settings: NotificationSettings}}>('/api/notifications/settings', settings);
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to update notification settings', error);
  }
};

/**
 * Cleans up old notifications (maintenance).
 * @param daysToKeep - Number of days to keep notifications
 * @returns Promise<{ success: boolean; cleaned: number; summary: any }>
 */
export const cleanupOldNotifications = async (daysToKeep?: number): Promise<{ success: boolean; cleaned: number; summary: any }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: {cleaned: number; summary: any}}>('/api/notifications/cleanup', {
      params: { daysToKeep },
    });
    return {
      success: response.data.success,
      cleaned: response.data.data.cleaned,
      summary: response.data.data.summary,
    };
  } catch (error) {
    throw new ApiError('Failed to cleanup old notifications', error);
  }
};

/**
 * Sends a test notification (for debugging/config).
 * @param type - Notification type
 * @param sendEmail - Whether to send email
 * @returns Promise<NotificationDetailsResponse>
 */
export const sendTestNotification = async (
  type: Notification['type'], 
  sendEmail?: boolean
): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.post<NotificationDetailsResponse>('/api/notifications/test', { 
      type, 
      sendEmail 
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to send test notification', error);
  }
};