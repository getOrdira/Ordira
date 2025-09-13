// src/components/ui/navigation/notification-dropdown.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

// Import types from your API client to ensure consistency
import type { Notification as BackendNotification } from '@/lib/api/notifications';

const dropdownVariants = cva(
  "absolute bg-white border border-gray-200 rounded-2xl shadow-xl z-50 backdrop-blur-sm",
  {
    variants: {
      size: {
        sm: "w-80",
        md: "w-96", 
        lg: "w-[480px]",
        xl: "w-[520px]"
      },
      position: {
        "bottom-left": "top-full left-0 mt-2",
        "bottom-right": "top-full right-0 mt-2",
        "bottom-center": "top-full left-1/2 transform -translate-x-1/2 mt-2",
        "top-left": "bottom-full left-0 mb-2",
        "top-right": "bottom-full right-0 mb-2", 
        "top-center": "bottom-full left-1/2 transform -translate-x-1/2 mb-2"
      }
    },
    defaultVariants: {
      size: "lg",
      position: "bottom-right"
    }
  }
);

// Aligned with your backend types
export interface NotificationAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  onClick: () => void;
}

export interface NotificationSender {
  name: string;
  avatar?: string;
  initials?: string;
  backgroundColor?: string;
  isOnline?: boolean;
}

// Frontend notification interface that extends/transforms backend data
export interface Notification extends Omit<BackendNotification, 'createdAt' | 'updatedAt'> {
  id: string;
  title?: string;
  time: string; // Formatted relative time
  read: boolean;
  sender?: NotificationSender;
  actions?: NotificationAction[];
  metadata?: {
    planName?: string;
    fileName?: string;
    fileSize?: string;
    fileIcon?: string;
    emoji?: string;
    targetName?: string;
    // Add backend fields that might be useful for UI
    actionUrl?: string;
    expiresAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
  onViewAll?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

const NotificationDropdown = React.forwardRef<HTMLDivElement, NotificationDropdownProps>(
  ({
    notifications,
    onNotificationClick,
    onMarkAllRead,
    onViewAll,
    onSettingsClick,
    className
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archive'>('all');
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const unreadCount = notifications.filter(n => !n.read).length;
    const archivedCount = notifications.filter(n => n.details?.archived).length;
    
    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);
    
    const handleToggle = () => {
      setIsOpen(!isOpen);
    };
    
    const trigger = (
      <button 
        onClick={handleToggle}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200"
      >
        <BellIcon className="w-5 h-5 text-[var(--muted)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-satoshi-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );

    const renderNotificationAvatar = (notification: Notification) => {
      if (notification.sender?.avatar) {
        return (
          <div className="relative">
            <img
              src={notification.sender.avatar}
              alt={notification.sender.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {notification.sender.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
        );
      }
      
      if (notification.sender?.initials) {
        return (
          <div className="relative">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-satoshi-medium"
              style={{ backgroundColor: notification.sender.backgroundColor || '#6B7280' }}
            >
              {notification.sender.initials}
            </div>
            {notification.sender.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
        );
      }
      
      // Default avatar based on category from backend
      const getAvatarByCategory = () => {
        const baseClasses = "w-10 h-10 rounded-full flex items-center justify-center";
        
        switch (notification.details?.category) {
          case 'system':
            return (
              <div className={`${baseClasses} bg-blue-100`}>
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.84l-4.5-3.6a1 1 0 01-.383-.84V8.6a1 1 0 01.383-.84l4.5-3.6a1 1 0 01.617-.084zM14 5a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1V5zM14 10a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zM14 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1z" clipRule="evenodd" />
                </svg>
              </div>
            );
          case 'billing':
            return (
              <div className={`${baseClasses} bg-green-100`}>
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h6zM4 14a2 2 0 002 2h8a2 2 0 002-2v-2H4v2z" />
                </svg>
              </div>
            );
          case 'certificate':
            return (
              <div className={`${baseClasses} bg-purple-100`}>
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                </svg>
              </div>
            );
          case 'vote':
            return (
              <div className={`${baseClasses} bg-orange-100`}>
                <svg className="w-5 h-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            );
          case 'invite':
            return (
              <div className={`${baseClasses} bg-pink-100`}>
                <svg className="w-5 h-5 text-pink-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              </div>
            );
          case 'order':
            return (
              <div className={`${baseClasses} bg-indigo-100`}>
                <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9z" clipRule="evenodd" />
                </svg>
              </div>
            );
          case 'security':
            return (
              <div className={`${baseClasses} bg-red-100`}>
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            );
          default:
            return (
              <div className={`${baseClasses} bg-gray-100`}>
                <BellIcon className="w-5 h-5 text-gray-500" />
              </div>
            );
        }
      };
      
      return getAvatarByCategory();
    };

    const renderPriorityIndicator = (priority?: string) => {
      if (!priority || priority === 'medium') return null;
      
      const getPriorityColor = () => {
        switch (priority) {
          case 'urgent': return 'bg-red-500';
          case 'high': return 'bg-orange-500';
          case 'low': return 'bg-gray-400';
          default: return 'bg-blue-500';
        }
      };
      
      return (
        <div className={`absolute -top-1 -left-1 w-3 h-3 ${getPriorityColor()} rounded-full border-2 border-white`} />
      );
    };

    const renderNotificationContent = (notification: Notification) => {
      const baseContent = (
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {notification.title && (
                <h4 className="text-sm font-satoshi-medium text-[var(--ordira-accent)] mb-1 line-clamp-1">
                  {notification.title}
                </h4>
              )}
              <p className="text-sm font-satoshi-regular text-[var(--ordira-accent)] leading-relaxed line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[var(--muted)] font-satoshi-regular">
                  {notification.details?.category && (
                    <span className="capitalize">{notification.details.category}</span>
                  )}
                  {notification.type && notification.details?.category && ' • '}
                  {notification.type && (
                    <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                  )}
                </p>
                <span className="text-xs text-[var(--muted)] font-satoshi-regular">
                  {notification.time}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons for specific types */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex items-center space-x-2 mt-3">
              {notification.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-satoshi-medium transition-all duration-200",
                    action.variant === 'primary' 
                      ? "bg-[var(--ordira-accent)] text-white hover:bg-[var(--ordira-black)]"
                      : action.variant === 'destructive'
                      ? "bg-[var(--error)] text-white hover:bg-[var(--error-dark)]"
                      : "bg-white border border-gray-200 text-[var(--ordira-accent)] hover:bg-gray-50"
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
      
      return baseContent;
    };

    const filteredNotifications = notifications.filter(notification => {
      if (activeTab === 'unread') {
        return !notification.read;
      }
      if (activeTab === 'archive') {
        return notification.details?.archived || notification.read;
      }
      return true; // 'all' shows everything
    });

    const getTabCount = (tab: string) => {
      switch (tab) {
        case 'unread': return unreadCount;
        case 'archive': return archivedCount;
        default: return notifications.length;
      }
    };

    return (
      <div ref={dropdownRef} className={cn("relative inline-block", className)}>
        {/* Trigger */}
        {trigger}
        
        {/* Dropdown Panel */}
        {isOpen && (
          <div
            ref={ref}
            className={cn(dropdownVariants({ size: "lg", position: "bottom-right" }))}
            role="menu"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-satoshi-medium text-[var(--ordira-accent)]">Notifications</h3>
                <div className="flex items-center space-x-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllRead}
                      className="text-sm text-[var(--ordira-accent)] hover:text-[var(--primary)] font-satoshi-regular underline transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={onSettingsClick}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Cog6ToothIcon className="w-4 h-4 text-[var(--muted)]" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-6">
                {(['all', 'unread', 'archive'] as const).map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-satoshi-medium pb-2 border-b-2 transition-colors",
                      activeTab === tab 
                        ? "text-[var(--ordira-accent)] border-[var(--ordira-accent)]" 
                        : "text-[var(--muted)] border-transparent hover:text-[var(--ordira-accent)]"
                    )}
                  >
                    <span className="capitalize">{tab}</span>
                    <span className={cn(
                      "text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center font-satoshi-medium",
                      activeTab === tab 
                        ? "bg-[var(--ordira-accent)] text-white" 
                        : "bg-gray-200 text-[var(--muted)]"
                    )}>
                      {getTabCount(tab)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => onNotificationClick?.(notification.id)}
                    className={cn(
                      "w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors relative",
                      !notification.read && "bg-[var(--primary)]/5"
                    )}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Avatar with priority indicator */}
                      <div className="flex-shrink-0 relative">
                        {renderNotificationAvatar(notification)}
                        {renderPriorityIndicator(notification.details?.priority)}
                      </div>
                      
                      {/* Content */}
                      {renderNotificationContent(notification)}
                      
                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div className="absolute top-4 right-6 w-2 h-2 bg-[var(--primary)] rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="text-[var(--muted)] text-sm font-satoshi-regular">
                    No notifications in {activeTab === 'all' ? 'this view' : activeTab}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <>
                <div className="border-t border-gray-100" />
                <button
                  onClick={onViewAll}
                  className="w-full px-6 py-4 text-sm text-[var(--primary)] hover:bg-gray-50 transition-colors text-center font-satoshi-medium"
                >
                  See all notifications
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

NotificationDropdown.displayName = "NotificationDropdown";

export { NotificationDropdown };