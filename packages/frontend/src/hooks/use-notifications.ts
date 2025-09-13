// src/hooks/use-notifications.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/providers/auth-provider';

// Import types and functions from our aligned API client
import {
  type Notification as BackendNotification,
  type NotificationListResponse,
  type UnreadCountResponse,
  type NotificationSettings,
  type BulkActionResponse,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification,
  bulkNotificationAction,
  getNotificationSettings,
  updateNotificationSettings,
} from '@/lib/api/notifications';

// Backend-aligned types for proper data handling
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationCategory = 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security';
export type NotificationType = 'vote_update' | 'transfer_success' | 'transfer_failed' | 'certificate_minted' | 'invitation_received' | 'invitation_accepted' | 'analytics_alert' | 'billing_update' | 'system';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// Frontend-specific interfaces that extend backend data
export interface NotificationSender {
  name: string;
  avatar?: string;
  initials?: string;
  backgroundColor?: string;
  isOnline?: boolean;
}

export interface NotificationAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  onClick: () => void;
}

// UI-optimized notification interface
export interface UINotification extends Omit<BackendNotification, 'createdAt' | 'updatedAt' | 'category' | 'priority' | 'deliveryStatus' | 'read' | '_id'> {
  id: string; // Transformed from _id
  time: string; // Formatted relative time
  read: boolean; // Mapped from isRead
  sender?: NotificationSender; // Extracted from details/data
  actions?: NotificationAction[]; // Generated based on type/category
  // Backend fields preserved
  priority?: NotificationPriority;
  category?: NotificationCategory;
  title?: string;
  actionUrl?: string;
  archived?: boolean;
  deliveryStatus?: DeliveryStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'priority';
  dateFrom?: string;
  dateTo?: string;
  archived?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  hasUnread: boolean;
  breakdown: Record<string, number>;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
  recent: number; // Notifications from last 24h
}

export interface UseNotificationsReturn {
  // State
  notifications: UINotification[];
  stats: NotificationStats;
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  bulkAction: (notificationIds: string[], action: 'read' | 'unread' | 'delete' | 'archive') => Promise<void>;
  handleNotificationClick: (notificationId: string) => Promise<void>;
  
  // Settings
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  
  // Utilities
  getFilteredNotifications: (filter: 'all' | 'unread' | 'archived') => UINotification[];
  getNotificationsByCategory: (category: NotificationCategory) => UINotification[];
  getNotificationsByPriority: (priority: NotificationPriority) => UINotification[];
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  
  // State management
  const [notifications, setNotifications] = useState<UINotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    hasUnread: false,
    breakdown: {},
    byCategory: {} as Record<NotificationCategory, number>,
    byPriority: {} as Record<NotificationPriority, number>,
    recent: 0,
  });
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup and caching
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<number>(0);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Transform backend notification to UI format
  const transformNotification = useCallback((backendNotification: BackendNotification): UINotification => {
    const now = new Date();
    const createdAt = new Date(backendNotification.createdAt);
    const timeDiff = now.getTime() - createdAt.getTime();
    
    // Format relative time
    const formatTime = (diff: number): string => {
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 7) return createdAt.toLocaleDateString();
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      if (seconds > 30) return `${seconds}s ago`;
      return 'Just now';
    };

    // Extract sender info from notification data
    const extractSender = (data: any): NotificationSender | undefined => {
      if (!data?.sender) return undefined;
      
      return {
        name: data.sender.name || data.sender.businessName || data.sender.manufacturerName || 'Unknown User',
        avatar: data.sender.avatar || data.sender.profilePictureUrl,
        initials: data.sender.initials || data.sender.name?.charAt(0).toUpperCase() || '?',
        backgroundColor: data.sender.backgroundColor || '#6B7280',
        isOnline: data.sender.isOnline || false,
      };
    };

    return {
      id: backendNotification._id,
      type: backendNotification.type,
      message: backendNotification.message,
      time: formatTime(timeDiff),
      read: backendNotification.isRead ?? false,
      sender: extractSender(backendNotification.details),
      
      // Map backend fields properly
      priority: backendNotification.details?.priority,
      category: backendNotification.details?.category,
      title: backendNotification.details?.title,
      actionUrl: backendNotification.details?.actionUrl,
      archived: backendNotification.details?.archived,
      deliveryStatus: backendNotification.details?.deliveryStatus,
      expiresAt: backendNotification.details?.expiresAt,
      
      // Preserve backend structure
      business: backendNotification.business,
      details: backendNotification.details,
      isEmailSent: backendNotification.isEmailSent,
      emailError: backendNotification.emailError,
      createdAt: backendNotification.createdAt.toString(),
      updatedAt: backendNotification.updatedAt.toString(),
    };
  }, []);

  // Generate actions based on notification type and category
  const generateActions = useCallback((notification: UINotification): NotificationAction[] => {
    const actions: NotificationAction[] = [];

    // Category-based actions
    switch (notification.category) {
      case 'invite':
        if (notification.type === 'invitation_received') {
          actions.push(
            {
              id: 'accept',
              label: 'Accept',
              variant: 'primary',
              onClick: async () => {
                console.log('Invitation accepted:', notification.id);
                // Handle invitation acceptance
                if (notification.actionUrl) {
                  window.location.href = notification.actionUrl;
                }
              },
            },
            {
              id: 'decline',
              label: 'Decline',
              variant: 'destructive',
              onClick: async () => {
                console.log('Invitation declined:', notification.id);
                await markAsRead(notification.id);
              },
            }
          );
        }
        break;
        
      case 'billing':
        if (notification.details?.requiresAction) {
          actions.push({
            id: 'view_billing',
            label: 'View Details',
            variant: 'primary',
            onClick: async () => {
              console.log('Billing details viewed:', notification.id);
              if (notification.actionUrl) {
                window.location.href = notification.actionUrl;
              }
            },
          });
        }
        break;
        
      case 'certificate':
        if (notification.type === 'certificate_minted') {
          actions.push({
            id: 'view_certificate',
            label: 'View Certificate',
            variant: 'primary',
            onClick: async () => {
              console.log('Certificate viewed:', notification.id);
              if (notification.actionUrl) {
                window.location.href = notification.actionUrl;
              }
            },
          });
        }
        break;
        
      case 'vote':
        if (notification.type === 'vote_update') {
          actions.push({
            id: 'view_results',
            label: 'View Results',
            variant: 'secondary',
            onClick: async () => {
              console.log('Vote results viewed:', notification.id);
              if (notification.actionUrl) {
                window.location.href = notification.actionUrl;
              }
            },
          });
        }
        break;
    }

    return actions;
  }, []);

  // Fetch notifications with proper error handling and caching
  const fetchNotifications = useCallback(async (filters: NotificationFilters = {}) => {
    if (!user) return;
    
    // Prevent duplicate requests
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return; // Debounce 1 second
    lastFetchRef.current = now;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    
    try {
      const [notificationsResponse, unreadResponse] = await Promise.all([
        getNotifications(filters),
        getUnreadCount(),
      ]);
      
      // Transform notifications
      const transformedNotifications = notificationsResponse.data.notifications.map(notification => {
        const uiNotification = transformNotification(notification);
        return {
          ...uiNotification,
          actions: generateActions(uiNotification),
        };
      });
      
      setNotifications(transformedNotifications);
      
      // Update stats
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentCount = transformedNotifications.filter(n => 
        new Date(n.createdAt) > oneDayAgo
      ).length;
      
      // Calculate category and priority breakdowns
      const byCategory = transformedNotifications.reduce((acc, n) => {
        if (n.category) {
          acc[n.category] = (acc[n.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<NotificationCategory, number>);
      
      const byPriority = transformedNotifications.reduce((acc, n) => {
        if (n.priority) {
          acc[n.priority] = (acc[n.priority] || 0) + 1;
        }
        return acc;
      }, {} as Record<NotificationPriority, number>);
      
      setStats({
        total: notificationsResponse.data.total,
        unread: notificationsResponse.data.unread,
        hasUnread: unreadResponse.data.hasUnread,
        breakdown: unreadResponse.data.breakdown,
        byCategory,
        byPriority,
        recent: recentCount,
      });
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch notifications');
        console.error('Failed to fetch notifications:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, transformNotification, generateActions]);

  // Refresh notifications (clear cache and refetch)
  const refreshNotifications = useCallback(async () => {
    lastFetchRef.current = 0; // Reset debounce
    await fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        hasUnread: prev.unread > 1,
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const result = await apiMarkAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      setStats(prev => ({ 
        ...prev, 
        unread: 0, 
        hasUnread: false 
      }));
      
      console.log(`Marked ${result.markedCount} notifications as read`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotificationById = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        unread: deletedNotification?.read ? prev.unread : Math.max(0, prev.unread - 1),
        hasUnread: (prev.unread > 1) || (prev.unread === 1 && !deletedNotification?.read),
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      throw err;
    }
  }, [notifications]);

  // Bulk action handler
  const bulkActionHandler = useCallback(async (
    notificationIds: string[], 
    action: 'read' | 'unread' | 'delete' | 'archive'
  ) => {
    try {
      const result = await bulkNotificationAction(notificationIds, action);
      
      // Update local state based on action
      if (action === 'delete') {
        setNotifications(prev => 
          prev.filter(n => !notificationIds.includes(n.id))
        );
        setStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - result.data.stats.successful),
        }));
      } else if (action === 'read') {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          )
        );
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - result.data.stats.successful),
          hasUnread: prev.unread > result.data.stats.successful,
        }));
      } else if (action === 'unread') {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, read: false } : n
          )
        );
      } else if (action === 'archive') {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, archived: true } : n
          )
        );
      }
      
      console.log(`Bulk ${action}: ${result.data.stats.successful} successful, ${result.data.stats.failed} failed`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to perform bulk ${action}`);
      throw err;
    }
  }, []);

  // Handle notification click (mark as read and navigate)
  const handleNotificationClick = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    try {
      // Mark as read if not already read
      if (!notification.read) {
        await markNotificationAsRead(notificationId);
      }
      
      // Navigate to action URL if available
      if (notification.actionUrl) {
        if (notification.actionUrl.startsWith('http')) {
          window.open(notification.actionUrl, '_blank');
        } else {
          window.location.href = notification.actionUrl;
        }
      }
      
    } catch (err) {
      console.error('Failed to handle notification click:', err);
    }
  }, [notifications, markNotificationAsRead]);

  // Fetch notification settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const settingsData = await getNotificationSettings();
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
    }
  }, [user]);

  // Update notification settings
  const updateSettingsHandler = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = await updateNotificationSettings(newSettings);
      setSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    }
  }, []);

  // Utility functions
  const getFilteredNotifications = useCallback((filter: 'all' | 'unread' | 'archived') => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'archived':
        return notifications.filter(n => n.archived);
      default:
        return notifications;
    }
  }, [notifications]);

  const getNotificationsByCategory = useCallback((category: NotificationCategory) => {
    return notifications.filter(n => n.category === category);
  }, [notifications]);

  const getNotificationsByPriority = useCallback((priority: NotificationPriority) => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  // Initial data loading
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchSettings();
    }
  }, [user, fetchNotifications, fetchSettings]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    notifications,
    stats,
    settings,
    loading,
    error,
    
    // Actions
    fetchNotifications,
    refreshNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteNotificationById,
    bulkAction: bulkActionHandler,
    handleNotificationClick,
    
    // Settings
    fetchSettings,
    updateSettings: updateSettingsHandler,
    
    // Utilities
    getFilteredNotifications,
    getNotificationsByCategory,
    getNotificationsByPriority,
  };
}

