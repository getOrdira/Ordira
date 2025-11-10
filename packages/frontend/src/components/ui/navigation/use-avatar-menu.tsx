// src/components/ui/navigation/use-avatar-menu.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const dropdownVariants = cva(
  // Base dropdown panel styles - clean white design with rounded corners like your image
  "absolute bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-2 min-w-[200px] backdrop-blur-sm",
  {
    variants: {
      size: {
        sm: "min-w-[180px]",
        md: "min-w-[220px]", // Slightly wider to match your image
        lg: "min-w-[280px]",
        xl: "min-w-[320px]"
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
  // Base item styles with Ordira branding
  "flex items-center space-x-3 px-4 py-3 text-sm font-satoshi-regular transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 rounded-lg mx-2",
  {
    variants: {
      variant: {
        default: "text-[var(--ordira-accent)] hover:bg-gray-50 hover:text-[var(--primary)]",
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
                      <div className="w-5 h-5 text-[var(--muted)]">
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
                      <div className="w-5 h-5 text-[var(--muted)]">
                        {item.icon}
                      </div>
                    )}
                    <span>{item.label}</span>
                  </button>
                )}
                
                {/* Divider after item if needed */}
                {index < items.length - 1 && items[index + 1]?.id.startsWith('divider-') && (
                  <div className="border-t border-gray-100 my-2 mx-2" />
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
  <div className="border-t border-gray-100 my-2 mx-2" />
);

// Dropdown Header Component
export interface DropdownHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const DropdownHeader = ({ children, className }: DropdownHeaderProps) => (
  <div className={cn("px-4 py-2 text-xs font-satoshi-medium text-[var(--muted)] uppercase tracking-wide", className)}>
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
      <button className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200">
        <img
          src={user.avatar || '/default-avatar.png'}
          alt={user.name}
          className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100"
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
        {/* User Info Header - matches your image layout */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
            />
            <div>
              <div className="font-satoshi-medium text-[var(--ordira-accent)] text-base">{user.name}</div>
              <div className="text-sm font-satoshi-regular text-[var(--muted)]">{user.email}</div>
            </div>
          </div>
        </div>
        
        {/* Menu Items - styled to match your image */}
        <div className="py-2">
          <button
            onClick={onProfileClick}
            className={cn(dropdownItemVariants())}
          >
            <div className="w-5 h-5 text-[var(--muted)]">
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
            <div className="w-5 h-5 text-[var(--muted)]">
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
            <div className="w-5 h-5 text-[var(--muted)]">
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
            <div className="w-5 h-5 text-[var(--muted)]">
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
            <div className="w-5 h-5">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114L8.704 10.75H18.25A.75.75 0 0019 10z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Log out</span>
          </button>
        </div>
      </Dropdown>
    );
  }
);

UserProfileDropdown.displayName = "UserProfileDropdown";

// Notification Dropdown with Ordira branding
export interface NotificationDropdownProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    avatar?: string;
  }>;
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
      <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-all duration-200">
        <svg className="w-5 h-5 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-satoshi-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );

    return (
      <Dropdown
        ref={ref}
        trigger={trigger}
        size="xl"
        position="bottom-right"
        className={className}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-satoshi-medium text-[var(--ordira-accent)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-[var(--primary)] hover:text-[var(--primary-dark)] font-satoshi-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
        
        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => onNotificationClick?.(notification.id)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-lg mx-2 mb-1",
                  !notification.read && "bg-[var(--primary)]/5"
                )}
              >
                <div className="flex items-start space-x-3">
                  {notification.avatar && (
                    <img
                      src={notification.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-satoshi-medium text-[var(--ordira-accent)] truncate">
                        {notification.title}
                      </h4>
                      <span className="text-xs font-satoshi-regular text-[var(--muted)] ml-2">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-sm font-satoshi-regular text-[var(--muted)] line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-[var(--primary)] rounded-full mt-2" />
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <div className="text-[var(--muted)] text-sm font-satoshi-regular">No notifications</div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownDivider />
            <button
              onClick={onViewAll}
              className="w-full px-4 py-3 text-sm text-[var(--primary)] hover:bg-gray-50 transition-colors text-center font-satoshi-medium rounded-lg mx-2"
            >
              View all notifications
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