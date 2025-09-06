// src/components/ui/navigation/notification-dropdown-wrapper.tsx
'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // Assuming you're using sonner for notifications

// Import our aligned components and hooks
import { NotificationDropdown } from './notifications-dropdown';
import { useNotifications } from '@/hooks/use-notifications';
import type { NotificationAction } from '@/hooks/use-notifications';

interface NotificationDropdownWrapperProps {
  className?: string;

  onNotificationClick?: (notificationId: string) => void;
  onViewAll?: () => void;
  onSettingsClick?: () => void;
  maxDisplayNotifications?: number;
  refreshInterval?: number;
  showToasts?: boolean;
}

export function NotificationDropdownWrapper({
  className,
  onNotificationClick: customNotificationClick,
  onViewAll: customViewAll,
  onSettingsClick: customSettingsClick,
  maxDisplayNotifications = 10,
  refreshInterval = 30000,
  showToasts = true,
}: NotificationDropdownWrapperProps) {
  const router = useRouter();
  
  // Use our aligned notification hook
  const {
    notifications,
    stats,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    bulkAction,
    refreshNotifications,
  } = useNotifications();

  // Limit notifications displayed in dropdown
  const displayNotifications = useMemo(() => {
    return notifications.slice(0, maxDisplayNotifications);
  }, [notifications, maxDisplayNotifications]);

  // Enhanced notification click handler with error handling
  const handleNotificationClickWithErrorHandling = useCallback(async (notificationId: string) => {
    try {
      if (customNotificationClick) {
        customNotificationClick(notificationId);
        return;
      }
      
      // Use the hook's built-in handler which marks as read and navigates
      await handleNotificationClick(notificationId);
      
      if (showToasts) {
        toast.success('Notification opened');
      }
    } catch (err) {
      console.error('Failed to handle notification click:', err);
      if (showToasts) {
        toast.error('Failed to open notification');
      }
    }
  }, [customNotificationClick, handleNotificationClick, showToasts]);

  // Mark all as read with success feedback
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      
      if (showToasts) {
        toast.success(`Marked ${stats.unread} notifications as read`);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      if (showToasts) {
        toast.error('Failed to mark notifications as read');
      }
    }
  }, [markAllAsRead, stats.unread, showToasts]);

  // Navigation handlers
  const handleViewAll = useCallback(() => {
    if (customViewAll) {
      customViewAll();
      return;
    }
    
    // Navigate to dedicated notifications page
    router.push('/notifications');
  }, [customViewAll, router]);

  const handleSettingsClick = useCallback(() => {
    if (customSettingsClick) {
      customSettingsClick();
      return;
    }
    
    // Navigate to notification settings
    router.push('/settings/notifications');
  }, [customSettingsClick, router]);

  // Generate enhanced notification actions based on backend data
  const generateNotificationActions = useCallback((notification: any): NotificationAction[] => {
    const actions: NotificationAction[] = [];

    // Category-specific actions that align with backend notification types
    switch (notification.category) {
      case 'invite':
        if (notification.type === 'invitation_received' && !notification.read) {
          actions.push(
            {
              id: 'accept_invite',
              label: 'Accept',
              variant: 'primary',
              onClick: async () => {
                try {
                  // Mark as read first
                  await markAsRead(notification.id);
                  
                  // Navigate to invitation action URL
                  if (notification.actionUrl) {
                    router.push(notification.actionUrl);
                  } else {
                    router.push('/invitations');
                  }
                  
                  if (showToasts) {
                    toast.success('Invitation accepted');
                  }
                } catch (err) {
                  console.error('Failed to accept invitation:', err);
                  if (showToasts) {
                    toast.error('Failed to accept invitation');
                  }
                }
              },
            },
            {
              id: 'decline_invite',
              label: 'Decline',
              variant: 'destructive',
              onClick: async () => {
                try {
                  await markAsRead(notification.id);
                  
                  if (showToasts) {
                    toast.success('Invitation declined');
                  }
                } catch (err) {
                  console.error('Failed to decline invitation:', err);
                  if (showToasts) {
                    toast.error('Failed to decline invitation');
                  }
                }
              },
            }
          );
        }
        break;

      case 'billing':
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          actions.push({
            id: 'view_billing',
            label: 'View Details',
            variant: 'primary',
            onClick: async () => {
              try {
                await markAsRead(notification.id);
                
                if (notification.actionUrl) {
                  router.push(notification.actionUrl);
                } else {
                  router.push('/billing');
                }
                
                if (showToasts) {
                  toast.success('Redirecting to billing details');
                }
              } catch (err) {
                console.error('Failed to view billing details:', err);
                if (showToasts) {
                  toast.error('Failed to view billing details');
                }
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
              try {
                await markAsRead(notification.id);
                
                if (notification.actionUrl) {
                  window.open(notification.actionUrl, '_blank');
                } else {
                  router.push('/certificates');
                }
                
                if (showToasts) {
                  toast.success('Certificate opened');
                }
              } catch (err) {
                console.error('Failed to view certificate:', err);
                if (showToasts) {
                  toast.error('Failed to view certificate');
                }
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
              try {
                await markAsRead(notification.id);
                
                if (notification.actionUrl) {
                  router.push(notification.actionUrl);
                } else {
                  router.push('/voting');
                }
                
                if (showToasts) {
                  toast.success('Viewing vote results');
                }
              } catch (err) {
                console.error('Failed to view vote results:', err);
                if (showToasts) {
                  toast.error('Failed to view vote results');
                }
              }
            },
          });
        }
        break;

      case 'order':
        actions.push({
          id: 'view_order',
          label: 'View Order',
          variant: 'secondary',
          onClick: async () => {
            try {
              await markAsRead(notification.id);
              
              if (notification.actionUrl) {
                router.push(notification.actionUrl);
              } else {
                router.push('/orders');
              }
              
              if (showToasts) {
                toast.success('Viewing order details');
              }
            } catch (err) {
              console.error('Failed to view order:', err);
              if (showToasts) {
                toast.error('Failed to view order');
              }
            }
          },
        });
        break;

      case 'security':
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          actions.push({
            id: 'review_security',
            label: 'Review',
            variant: 'primary',
            onClick: async () => {
              try {
                await markAsRead(notification.id);
                
                if (notification.actionUrl) {
                  router.push(notification.actionUrl);
                } else {
                  router.push('/settings/security');
                }
                
                if (showToasts) {
                  toast.success('Reviewing security alert');
                }
              } catch (err) {
                console.error('Failed to review security alert:', err);
                if (showToasts) {
                  toast.error('Failed to review security alert');
                }
              }
            },
          });
        }
        break;
    }

    // Common dismiss action for all notifications
    if (!notification.read) {
      actions.push({
        id: 'dismiss',
        label: 'Dismiss',
        variant: 'secondary',
        onClick: async () => {
          try {
            await markAsRead(notification.id);
            
            if (showToasts) {
              toast.success('Notification dismissed');
            }
          } catch (err) {
            console.error('Failed to dismiss notification:', err);
            if (showToasts) {
              toast.error('Failed to dismiss notification');
            }
          }
        },
      });
    }

    return actions;
  }, [markAsRead, router, showToasts]);

  // Transform notifications to include generated actions
  const notificationsWithActions = useMemo(() => {
    return displayNotifications.map(notification => ({
      ...notification,
      actions: generateNotificationActions(notification),
    }));
  }, [displayNotifications, generateNotificationActions]);

  // Handle bulk operations from context menu (future enhancement)
  const handleBulkMarkAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await bulkAction(notificationIds, 'read');
      
      if (showToasts) {
        toast.success(`Marked ${notificationIds.length} notifications as read`);
      }
    } catch (err) {
      console.error('Failed to bulk mark as read:', err);
      if (showToasts) {
        toast.error('Failed to mark notifications as read');
      }
    }
  }, [bulkAction, showToasts]);

  const handleBulkDelete = useCallback(async (notificationIds: string[]) => {
    try {
      await bulkAction(notificationIds, 'delete');
      
      if (showToasts) {
        toast.success(`Deleted ${notificationIds.length} notifications`);
      }
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      if (showToasts) {
        toast.error('Failed to delete notifications');
      }
    }
  }, [bulkAction, showToasts]);

  // Show error state if there's a persistent error
  if (error && !loading) {
    console.error('Notification error:', error);
    
    // Optional: Return error state component
    // return <NotificationErrorState onRetry={refreshNotifications} />;
  }

  return (
    <NotificationDropdown
      notifications={notificationsWithActions}
      onNotificationClick={handleNotificationClickWithErrorHandling}
      onMarkAllRead={handleMarkAllAsRead}
      onViewAll={handleViewAll}
      onSettingsClick={handleSettingsClick}
      className={className}
      // Additional props for enhanced functionality
      loading={loading}
      error={error}
      stats={stats}
      // Future enhancement: Add bulk operation handlers
      onBulkMarkAsRead={handleBulkMarkAsRead}
      onBulkDelete={handleBulkDelete}
      onRefresh={refreshNotifications}
    />
  );
}

// Export for use in header components
export default NotificationDropdownWrapper;

// Usage example in header component:
/*
// src/components/layout/Header.tsx
import { NotificationDropdownWrapper } from '@/components/ui/navigation/notification-dropdown-wrapper';

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-4">
        <Logo />
        <Navigation />
      </div>
      
      <div className="flex items-center space-x-4">
        <NotificationDropdownWrapper />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
*/

// Advanced usage with custom handlers:
/*
// Custom notification handling
<NotificationDropdownWrapper
  onNotificationClick={(id) => {
    // Custom tracking
    analytics.track('notification_clicked', { notificationId: id });
    // Default behavior still applies
  }}
  onViewAll={() => {
    analytics.track('view_all_notifications');
    router.push('/notifications');
  }}
  maxDisplayNotifications={15}
  showToasts={false} // Disable toasts if using custom notification system
/>
*/