// src/components/ui/navigation/dropdown.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '../primitives/button';

const dropdownVariants = cva(
  // Base dropdown panel styles
  "absolute bg-white border border-gray-200 rounded-2xl shadow-lg z-50 py-2 min-w-[200px]",
  {
    variants: {
      size: {
        sm: "min-w-[180px]",
        md: "min-w-[200px]",
        lg: "min-w-[240px]",
        xl: "min-w-[280px]",
        "2xl": "min-w-[380px]"
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
      size: "md",
      position: "bottom-right"
    }
  }
);

const dropdownItemVariants = cva(
  // Base item styles
  "flex items-center space-x-3 px-4 py-3 text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-[var(--dark)] hover:bg-gray-50",
        destructive: "text-[var(--error)] hover:bg-[var(--error)]/5"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  onClick?: () => void;
  href?: string;
}

export interface DropdownProps extends VariantProps<typeof dropdownVariants> {
  trigger: React.ReactNode;
  items?: DropdownItem[];
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({
    trigger,
    items = [],
    children,
    disabled = false,
    className,
    panelClassName,
    size,
    position,
    onOpenChange,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          onOpenChange?.(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onOpenChange]);
    
    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
          onOpenChange?.(false);
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onOpenChange]);
    
    const handleToggle = () => {
      if (!disabled) {
        const newState = !isOpen;
        setIsOpen(newState);
        onOpenChange?.(newState);
      }
    };
    
    const handleItemClick = (item: DropdownItem) => {
      if (!item.disabled) {
        item.onClick?.();
        if (!item.href) {
          setIsOpen(false);
          onOpenChange?.(false);
        }
      }
    };

    return (
      <div ref={dropdownRef} className={cn("relative inline-block", className)} {...props}>
        {/* Trigger */}
        <div
          onClick={handleToggle}
          className={cn(
            "cursor-pointer",
            disabled && "cursor-not-allowed opacity-50"
          )}
          role="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {trigger}
        </div>
        
        {/* Dropdown Panel */}
        {isOpen && (
          <div
            ref={ref}
            className={cn(
              dropdownVariants({ size, position }),
              panelClassName
            )}
            role="menu"
          >
            {/* Custom children content */}
            {children}
            
            {/* Generated items */}
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.href ? (
                  <a
                    href={item.href}
                    className={cn(dropdownItemVariants({ variant: item.variant }))}
                    role="menuitem"
                  >
                    {item.icon && (
                      <div className="w-4 h-4 text-[var(--muted)]">
                        {item.icon}
                      </div>
                    )}
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      dropdownItemVariants({ variant: item.variant }),
                      "w-full text-left"
                    )}
                    role="menuitem"
                  >
                    {item.icon && (
                      <div className="w-4 h-4 text-[var(--muted)]">
                        {item.icon}
                      </div>
                    )}
                    <span>{item.label}</span>
                  </button>
                )}
                
                {/* Divider after item if needed */}
                {index < items.length - 1 && items[index + 1]?.id.startsWith('divider-') && (
                  <div className="border-t border-gray-100 my-1" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = "Dropdown";

// Dropdown Divider Component
const DropdownDivider = () => (
  <div className="border-t border-gray-100 my-1" />
);

// Dropdown Header Component
export interface DropdownHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const DropdownHeader = ({ children, className }: DropdownHeaderProps) => (
  <div className={cn("px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide", className)}>
    {children}
  </div>
);

// User Profile Dropdown (matches your image exactly)
export interface UserProfileDropdownProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onProfileClick?: () => void;
  onInviteClick?: () => void;
  onSettingsClick?: () => void;
  onSupportClick?: () => void;
  onLogoutClick?: () => void;
  className?: string;
}

const UserProfileDropdown = React.forwardRef<HTMLDivElement, UserProfileDropdownProps>(
  ({
    user,
    onProfileClick,
    onInviteClick,
    onSettingsClick,
    onSupportClick,
    onLogoutClick,
    className
  }, ref) => {
    const trigger = (
      <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
        <img
          src={user.avatar || '/default-avatar.png'}
          alt={user.name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <ChevronDownIcon className="w-4 h-4 text-[var(--muted)]" />
      </button>
    );

    return (
      <Dropdown
        ref={ref}
        trigger={trigger}
        size="lg"
        position="bottom-right"
        className={className}
      >
        {/* User Info Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="font-medium text-[var(--dark)]">{user.name}</div>
              <div className="text-sm text-[var(--muted)]">{user.email}</div>
            </div>
          </div>
        </div>
        
        {/* Menu Items */}
        <button
          onClick={onProfileClick}
          className={cn(dropdownItemVariants())}
        >
          <div className="w-4 h-4 text-[var(--muted)]">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
            </svg>
          </div>
          <span>My Account</span>
        </button>
        
        <button
          onClick={onInviteClick}
          className={cn(dropdownItemVariants())}
        >
          <div className="w-4 h-4 text-[var(--muted)]">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654z" />
            </svg>
          </div>
          <span>Invite Friends</span>
        </button>
        
        <button
          onClick={onSettingsClick}
          className={cn(dropdownItemVariants())}
        >
          <div className="w-4 h-4 text-[var(--muted)]">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Settings</span>
        </button>
        
        <button
          onClick={onSupportClick}
          className={cn(dropdownItemVariants())}
        >
          <div className="w-4 h-4 text-[var(--muted)]">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.3 1.25-1.344A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Support</span>
        </button>
        
        <DropdownDivider />
        
        <button
          onClick={onLogoutClick}
          className={cn(dropdownItemVariants({ variant: 'destructive' }))}
        >
          <div className="w-4 h-4">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114L8.704 10.75H18.25A.75.75 0 0019 10z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Log out</span>
        </button>
      </Dropdown>
    );
  }
);

UserProfileDropdown.displayName = "UserProfileDropdown";

// Enhanced Notification Types
export interface NotificationAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: 'connection' | 'mention' | 'file' | 'general' | 'plan_upgrade' | 'edit';
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
  sender?: {
    name: string;
    avatar?: string;
    initials?: string;
    backgroundColor?: string;
  };
  actions?: NotificationAction[];
  metadata?: {
    planName?: string;
    fileName?: string;
    fileSize?: string;
    emoji?: string;
    category?: string;
  };
}

// Advanced Notification Dropdown (matches your image)
export interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
  onViewAll?: () => void;
  className?: string;
}

const NotificationDropdown = React.forwardRef<HTMLDivElement, NotificationDropdownProps>(
  ({
    notifications,
    onNotificationClick,
    onMarkAllRead,
    onViewAll,
    className
  }, ref) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const trigger = (
      <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <svg className="w-5 h-5 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--error)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );

    const renderNotificationAvatar = (notification: Notification) => {
      if (notification.sender?.avatar) {
        return (
          <img
            src={notification.sender.avatar}
            alt={notification.sender.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        );
      }
      
      if (notification.sender?.initials) {
        return (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: notification.sender.backgroundColor || '#6B7280' }}
          >
            {notification.sender.initials}
          </div>
        );
      }
      
      // Default avatar based on type
      return (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          {notification.type === 'connection' && (
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655z" />
            </svg>
          )}
          {notification.type === 'file' && (
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      );
    };

    const renderNotificationContent = (notification: Notification) => {
      switch (notification.type) {
        case 'connection':
          return (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[var(--dark)] line-clamp-2">
                  <span className="font-semibold">{notification.sender?.name}</span> joined to{' '}
                  {notification.metadata?.emoji} <span className="font-semibold">{notification.title}</span>
                </p>
                <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0">
                  {notification.time}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-2">
                {notification.metadata?.category}
              </p>
            </div>
          );
          
        case 'mention':
          return (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[var(--dark)] line-clamp-2">
                  <span className="font-semibold">{notification.sender?.name}</span> mention you in{' '}
                  {notification.metadata?.emoji} <span className="font-semibold">{notification.title}</span>
                </p>
                <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0">
                  {notification.time}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {notification.metadata?.category}
              </p>
            </div>
          );
          
        case 'plan_upgrade':
          return (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[var(--dark)] line-clamp-2">
                  <span className="font-semibold">{notification.sender?.name}</span> is requesting to upgrade{' '}
                  <span className="font-semibold">{notification.title}</span>
                </p>
                <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0">
                  {notification.time}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                {notification.metadata?.category}
              </p>
              
              {/* Action Buttons */}
              {notification.actions && (
                <div className="flex items-center space-x-2">
                  {notification.actions.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.variant === 'primary' ? 'primary' : action.variant === 'destructive' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
          
        case 'file':
          return (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[var(--dark)] line-clamp-2">
                  <span className="font-semibold">{notification.sender?.name}</span> upload a file
                </p>
                <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0">
                  {notification.time}
                </span>
              </div>
              
              {/* File Info */}
              <div className="flex items-center space-x-2 mt-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--accent)]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--dark)] truncate">
                    {notification.metadata?.fileName}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {notification.metadata?.fileSize}
                  </p>
                </div>
              </div>
            </div>
          );
          
        case 'edit':
          return (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[var(--dark)] line-clamp-2">
                  <span className="font-semibold">{notification.sender?.name}</span> edited{' '}
                  {notification.metadata?.emoji} <span className="font-semibold">{notification.title}</span>
                </p>
                <span className="text-xs text-[var(--muted)] ml-2 flex-shrink-0">
                  {notification.time}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {notification.metadata?.category}
              </p>
            </div>
          );
          
        default:
          return (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--dark)] truncate">
                  {notification.title}
                </h4>
                <span className="text-xs text-[var(--muted)] ml-2">
                  {notification.time}
                </span>
              </div>
              <p className="text-sm text-[var(--muted)] line-clamp-2 mt-1">
                {notification.message}
              </p>
            </div>
          );
      }
    };

    return (
      <Dropdown
        ref={ref}
        trigger={trigger}
        size="2xl"
        position="bottom-right"
        className={className}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--dark)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-sm text-[var(--dark)] hover:text-[var(--accent)] font-medium underline transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-sm font-medium text-[var(--dark)] border-b-2 border-[var(--dark)] pb-1">
              <span>All</span>
              <span className="bg-[var(--dark)] text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
            <button className="flex items-center space-x-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--dark)] transition-colors pb-1">
              <span>Following</span>
              <span className="bg-gray-200 text-[var(--muted)] text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                6
              </span>
            </button>
            <button className="text-sm font-medium text-[var(--muted)] hover:text-[var(--dark)] transition-colors pb-1">
              Archive
            </button>
            <button className="ml-auto p-1 rounded hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => onNotificationClick?.(notification.id)}
                className={cn(
                  "w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors relative",
                  !notification.read && "bg-blue-50/30"
                )}
              >
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {renderNotificationAvatar(notification)}
                    {notification.sender && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  
                  {/* Content */}
                  {renderNotificationContent(notification)}
                  
                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-[var(--accent)] rounded-full flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-[var(--muted)] text-sm">No notifications</div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownDivider />
            <button
              onClick={onViewAll}
              className="w-full px-6 py-4 text-sm text-[var(--accent)] hover:bg-gray-50 transition-colors text-center font-medium"
            >
              See all notifications
            </button>
          </>
        )}
      </Dropdown>
    );
  }
);

NotificationDropdown.displayName = "NotificationDropdown";

export { 
  Dropdown, 
  DropdownDivider, 
  DropdownHeader, 
  UserProfileDropdown, 
  NotificationDropdown,
  dropdownVariants 
};