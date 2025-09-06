// src/lib/api/notifications.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

// Backend-aligned notification interface matching INotification model
export interface Notification {
  _id: string;
  
  // Core recipient fields (mutually exclusive)
  business?: string; // Types.ObjectId as string
  manufacturer?: string; // Types.ObjectId as string
  
  // Core notification fields (required in backend)
  type: string; // Flexible string to handle various notification types
  message: string;
  data?: any; // Mixed type for flexible notification data
  read: boolean;
  
  // Enhanced fields from backend model
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security';
  title?: string;
  actionUrl?: string;
  expiresAt?: string; // ISO date string
  
  // Delivery tracking fields
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveryChannels?: Array<'in_app' | 'email' | 'sms' | 'push'>;
  deliveryAttempts?: number;
  lastDeliveryAttempt?: string; // ISO date string
  deliveryError?: string;
  
  // Bulk notification tracking
  batchId?: string;
  bulkNotification?: boolean;
  recipientEmail?: string;
  recipientName?: string;
  
  // Archive and management
  archived?: boolean;
  archivedAt?: string; // ISO date string
  deletedAt?: string; // ISO date string for soft delete
  
  // Notification lifecycle tracking
  viewedAt?: string; // ISO date string
  clickedAt?: string; // ISO date string
  interactionCount?: number;
  
  // Template and personalization
  templateId?: string;
  templateData?: Record<string, any>;
  personalizedMessage?: string;
  
  // Timestamps
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  
  // Legacy fields for backward compatibility
  details?: any; // Alias for data field
  isRead?: boolean; // Alias for read field
  isEmailSent?: boolean;
  emailError?: string;
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
      hasPrev?: boolean;
      totalPages?: number;
    };
    stats?: {
      byCategory: Record<string, number>;
      byPriority: Record<string, number>;
      byType: Record<string, number>;
      recent: number; // Last 24h
      thisWeek: number;
      thisMonth: number;
    };
  };
}

export interface NotificationDetailsResponse {
  success: boolean;
  message: string;
  data: {
    notification: Notification;
    relatedNotifications?: Notification[];
    context?: {
      recipientInfo: {
        id: string;
        type: 'business' | 'manufacturer';
        name: string;
      };
      isExpired: boolean;
      canRetry: boolean;
      deliveryPriority: number;
    };
  };
}

export interface UnreadCountResponse {
  success: boolean;
  message?: string;
  data: {
    count: number;
    hasUnread: boolean;
    breakdown: {
      [key: string]: number;
    };
    priority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
    category: {
      system: number;
      billing: number;
      certificate: number;
      vote: number;
      invite: number;
      order: number;
      security: number;
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
    updatedStats?: {
      total: number;
      unread: number;
    };
  };
}

// Enhanced filter interface matching backend capabilities
export interface NotificationFilters {
  // Basic filters
  unreadOnly?: boolean;
  type?: string;
  category?: Notification['category'];
  priority?: Notification['priority'];
  
  // Pagination
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'priority' | 'type' | 'category';
  sortOrder?: 'asc' | 'desc';
  
  // Date filtering
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  
  // Status filtering
  archived?: boolean;
  deliveryStatus?: Notification['deliveryStatus'];
  
  // Bulk operations
  batchId?: string;
  bulkNotification?: boolean;
  
  // Advanced filtering
  hasActionUrl?: boolean;
  isExpired?: boolean;
  interacted?: boolean; // Has viewedAt or clickedAt
  recipientType?: 'business' | 'manufacturer';
}

/**
 * Fetches list of notifications with filtering and pagination.
 * @param params - Optional query parameters
 * @returns Promise<NotificationListResponse>
 */
export const getNotifications = async (params?: NotificationFilters): Promise<NotificationListResponse> => {
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
 * Fetches notifications by category.
 * @param category - Notification category
 * @returns Promise<NotificationListResponse>
 */
export const getNotificationsByCategory = async (category: Notification['category']): Promise<NotificationListResponse> => {
  try {
    const response = await apiClient.get<NotificationListResponse>(`/api/notifications/category/${category}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch notifications by category', error);
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
  type: string;
  category: Notification['category'];
  title?: string;
  message: string;
  priority?: Notification['priority'];
  actionUrl?: string;
  expiresAt?: string;
  data?: any;
  deliveryChannels?: Array<'in_app' | 'email' | 'sms' | 'push'>;
  templateId?: string;
  templateData?: Record<string, any>;
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
 * Marks a notification as unread.
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const markAsUnread = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.put<NotificationDetailsResponse>(`/api/notifications/${id}/unread`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to mark notification as unread', error);
  }
};

/**
 * Marks all notifications as read.
 * @returns Promise<{ success: boolean; markedCount: number; stats: any }>
 */
export const markAllAsRead = async (): Promise<{ 
  success: boolean; 
  markedCount: number; 
  stats: any;
  updatedStats: { total: number; unread: number };
}> => {
  try {
    const response = await apiClient.put<{
      success: boolean; 
      data: {
        markedCount: number; 
        stats: any;
        updatedStats: { total: number; unread: number };
      }
    }>('/api/notifications/read-all');
    return {
      success: response.data.success,
      markedCount: response.data.data.markedCount,
      stats: response.data.data.stats,
      updatedStats: response.data.data.updatedStats,
    };
  } catch (error) {
    throw new ApiError('Failed to mark all notifications as read', error);
  }
};

/**
 * Archives a notification.
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const archiveNotification = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.put<NotificationDetailsResponse>(`/api/notifications/${id}/archive`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to archive notification', error);
  }
};

/**
 * Unarchives a notification.
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const unarchiveNotification = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.put<NotificationDetailsResponse>(`/api/notifications/${id}/unarchive`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to unarchive notification', error);
  }
};

/**
 * Marks a notification as viewed (for analytics).
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const markAsViewed = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.put<NotificationDetailsResponse>(`/api/notifications/${id}/view`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to mark notification as viewed', error);
  }
};

/**
 * Marks a notification as clicked (for analytics).
 * @param id - Notification ID
 * @returns Promise<NotificationDetailsResponse>
 */
export const markAsClicked = async (id: string): Promise<NotificationDetailsResponse> => {
  try {
    const response = await apiClient.put<NotificationDetailsResponse>(`/api/notifications/${id}/click`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to mark notification as clicked', error);
  }
};

/**
 * Deletes a notification.
 * @param id - Notification ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteNotification = async (id: string): Promise<{ 
  success: boolean;
  deleted: boolean;
  notificationId: string;
}> => {
  try {
    const response = await apiClient.delete<{
      success: boolean; 
      data: {
        deleted: boolean; 
        notificationId: string;
      }
    }>(`/api/notifications/${id}`);
    return { 
      success: response.data.success,
      deleted: response.data.data.deleted,
      notificationId: response.data.data.notificationId,
    };
  } catch (error) {
    throw new ApiError('Failed to delete notification', error);
  }
};

/**
 * Performs bulk actions on notifications.
 * @param notificationIds - Array of notification IDs
 * @param action - Action to perform ('read' | 'unread' | 'delete' | 'archive' | 'unarchive')
 * @returns Promise<BulkActionResponse>
 */
export const bulkNotificationAction = async (
  notificationIds: string[],
  action: 'read' | 'unread' | 'delete' | 'archive' | 'unarchive'
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
 * Fetches unread notification count with detailed breakdown.
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
 * Fetches notification statistics and analytics.
 * @param filters - Optional filters for stats calculation
 * @returns Promise<NotificationListResponse['data']['stats']>
 */
export const getNotificationStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
  category?: Notification['category'];
  type?: string;
}): Promise<NotificationListResponse['data']['stats']> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: NotificationListResponse['data']['stats'];
    }>('/api/notifications/stats', { params: filters });
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch notification stats', error);
  }
};

/**
 * Gets notification settings.
 * @returns Promise<NotificationSettings>
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const response = await apiClient.get<{
      success: boolean; 
      data: {
        settings: NotificationSettings;
      }
    }>('/api/notifications/settings');
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
    const response = await apiClient.put<{
      success: boolean; 
      data: {
        settings: NotificationSettings;
      }
    }>('/api/notifications/settings', settings);
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
export const cleanupOldNotifications = async (daysToKeep?: number): Promise<{ 
  success: boolean; 
  cleaned: number; 
  summary: any;
}> => {
  try {
    const response = await apiClient.delete<{
      success: boolean; 
      data: {
        cleaned: number; 
        summary: any;
      }
    }>('/api/notifications/cleanup', {
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
  type: string, 
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