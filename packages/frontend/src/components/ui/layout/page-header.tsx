// src/components/ui/layout/page-header.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils/utils';
import { useAvatarMenu } from '@/hooks/use-avatar-menu';
import { useNotifications } from '@/hooks/use-notifications';

// Icons
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
  CreditCard,
  BarChart3,
  HelpCircle,
  Check,
  X,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  ChevronRight
} from 'lucide-react';

// Types for user (matches your existing patterns)
export interface PageHeaderUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'brand' | 'manufacturer' | 'customer' | 'admin';
  businessName?: string;
  manufacturerName?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  user: PageHeaderUser;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showSearch?: boolean;
  showFilters?: boolean;
  className?: string;
  variant?: 'default' | 'minimal' | 'compact';
  breadcrumbs?: BreadcrumbItem[];
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ 
    user, 
    title, 
    description, 
    actions, 
    showSearch = false,
    showFilters = false,
    className,
    variant = 'default',
    breadcrumbs,
    ...props 
  }, ref) => {
    const pathname = usePathname();
    
    // Use your existing hooks
    const {
      isOpen: isAvatarOpen,
      toggleMenu: toggleAvatarMenu,
      closeMenu: closeAvatarMenu,
      menuActions,
      getInitials,
      uploadingAvatar,
      uploadNewAvatar,
    } = useAvatarMenu();

    const {
      notifications,
      stats,
      loading: notificationsLoading,
      markAsRead,
      markAllAsRead,
      handleNotificationClick,
    } = useNotifications();

    // Local state
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Refs for click outside
    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    // Get page title from pathname if not provided
    const getPageTitle = (pathname: string): string => {
      const routes: Record<string, string> = {
        '/brand/dashboard': 'Dashboard',
        '/brand/products': 'Products',
        '/brand/certificates': 'Certificates',
        '/brand/voting': 'Voting',
        '/brand/analytics': 'Analytics',
        '/brand/analytics/certificates': 'Certificate Analytics',
        '/brand/analytics/votes': 'Voting Analytics',
        '/brand/analytics/engagement': 'Engagement Analytics',
        '/brand/analytics/products': 'Product Analytics',
        '/brand/analytics/transactions': 'Transaction Analytics',
        '/brand/integrations': 'Integrations',
        '/brand/account/settings': 'Account Settings',
        '/brand/account/settings/profile': 'Profile Settings',
        '/brand/account/settings/billing': 'Billing Settings',
        '/brand/account/settings/assets': 'Asset Management',
        '/brand/account/settings/domains': 'Domain Settings',
        '/brand/account/settings/theme': 'Theme Settings',
        '/brand/account/settings/css': 'Custom CSS',
        // Add manufacturer routes
        '/manufacturer/dashboard': 'Dashboard',
        '/manufacturer/orders': 'Orders',
        '/manufacturer/products': 'Products',
        '/manufacturer/analytics': 'Analytics',
        '/manufacturer/account/settings': 'Account Settings',
        // Add customer routes
        '/proposals': 'Proposals',
        '/activity': 'Activity',
        '/profile': 'Profile',
      };
      return routes[pathname] || title || 'Dashboard';
    };

    const displayTitle = title || getPageTitle(pathname);

    // Close dropdowns when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
          closeAvatarMenu();
        }
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
          setIsNotificationsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeAvatarMenu]);

    // Handle avatar file upload
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadNewAvatar(file);
      }
      // Reset input
      event.target.value = '';
    };

    // Variant styles
    const variantStyles = {
      default: "py-4 px-6",
      minimal: "py-3 px-4", 
      compact: "py-2 px-4"
    };

    const titleSizes = {
      default: "text-2xl lg:text-3xl",
      minimal: "text-xl lg:text-2xl",
      compact: "text-lg lg:text-xl"
    };

    return (
      <header
        ref={ref}
        className={cn(
          "bg-[var(--background)] border-b border-[var(--border)] font-satoshi",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          {/* Left Section - Title & Description */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-3" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="w-4 h-4 text-[var(--caption-color)] mx-2" />
                      )}
                      {crumb.href ? (
                        <Link
                          href={crumb.href}
                          className="text-[var(--caption-color)] hover:text-[var(--heading-color)] font-satoshi-medium transition-colors"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-[var(--heading-color)] font-satoshi-medium">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Title */}
            <h1 className={cn(
              "font-satoshi-bold text-[var(--heading-color)] mb-1",
              titleSizes[variant]
            )}>
              {displayTitle}
            </h1>
            
            {/* Description or Subtitle */}
            {description && (
              <p className="text-[var(--caption-color)] font-satoshi text-sm lg:text-base">
                {description}
              </p>
            )}
            
            {!description && variant === 'default' && (
              <p className="text-[var(--caption-color)] font-satoshi text-sm">
                {user.businessName || user.manufacturerName || user.email}
              </p>
            )}
          </div>

          {/* Center Section - Search & Filters */}
          {(showSearch || showFilters) && (
            <div className="flex items-center gap-3 mx-6">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--caption-color)]" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl text-sm font-satoshi focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200"
                  />
                </div>
              )}
              
              {showFilters && (
                <button className="p-2 text-[var(--caption-color)] hover:text-[var(--heading-color)] hover:bg-[var(--background-secondary)] rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Right Section - Actions & User Menu */}
          <div className="flex items-center gap-3">
            {/* Custom Actions */}
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-[var(--caption-color)] hover:text-[var(--heading-color)] hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {stats.hasUnread && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center font-satoshi-bold">
                    {stats.unread > 9 ? '9+' : stats.unread}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Menu */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow-lg)] border border-[var(--card-border)] z-50 font-satoshi">
                  {/* Header */}
                  <div className="p-4 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-satoshi-bold text-[var(--heading-color)]">Notifications</h3>
                      {stats.hasUnread && (
                        <button 
                          onClick={() => markAllAsRead()}
                          className="text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] font-satoshi-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 6).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification.id)}
                          className={cn(
                            "p-4 hover:bg-[var(--background-secondary)] transition-colors cursor-pointer",
                            !notification.read && "bg-[var(--primary)]/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              !notification.read ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                            )} />
                            
                            <div className="flex-1 min-w-0">
                              {notification.title && (
                                <p className="font-satoshi-medium text-[var(--heading-color)] text-sm mb-1">
                                  {notification.title}
                                </p>
                              )}
                              <p className="text-[var(--caption-color)] text-sm leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-[var(--caption-color)] text-xs mt-2">
                                {notification.time}
                              </p>
                            </div>

                            {/* Actions */}
                            {notification.actions && notification.actions.length > 0 && (
                              <div className="flex items-center gap-1">
                                {notification.actions.slice(0, 2).map((action) => (
                                  <button
                                    key={action.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      action.onClick();
                                    }}
                                    className={cn(
                                      "px-2 py-1 text-xs rounded-md transition-colors font-satoshi-medium",
                                      action.variant === 'primary' && "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
                                      action.variant === 'destructive' && "bg-[var(--error)] text-white hover:bg-[var(--error-dark)]",
                                      (!action.variant || action.variant === 'secondary') && "bg-[var(--background-secondary)] text-[var(--heading-color)] hover:bg-[var(--border)]"
                                    )}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-[var(--caption-color)]">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-satoshi">No notifications</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 6 && (
                    <div className="p-4 border-t border-[var(--border)]">
                      <Link
                        href={user.role === 'brand' ? '/brand/notifications' : '/notifications'}
                        className="text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] font-satoshi-medium transition-colors"
                        onClick={() => setIsNotificationsOpen(false)}
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Avatar Dropdown */}
            <div className="relative" ref={avatarMenuRef}>
              <button
                onClick={toggleAvatarMenu}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--background-secondary)] transition-colors"
              >
                {/* Avatar */}
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-[var(--primary)] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-satoshi-bold">
                        {getInitials(user.name)}
                      </span>
                    </div>
                  )}
                  
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* User Info (hidden on mobile) */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                    {user.businessName || user.manufacturerName || user.name}
                  </p>
                  <p className="text-xs text-[var(--caption-color)] font-satoshi">
                    {user.email}
                  </p>
                </div>

                <ChevronDown className="w-4 h-4 text-[var(--caption-color)]" />
              </button>

              {/* Avatar Dropdown Menu */}
              {isAvatarOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow-lg)] border border-[var(--card-border)] z-50 font-satoshi">
                  {/* User Info */}
                  <div className="p-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[var(--primary)] rounded-full flex items-center justify-center">
                            <span className="text-white font-satoshi-bold">
                              {getInitials(user.name)}
                            </span>
                          </div>
                        )}
                        
                        {/* Upload Button */}
                        <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--primary-dark)] transition-colors">
                          <Plus className="w-3 h-3 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-satoshi-medium text-[var(--heading-color)] truncate">
                          {user.businessName || user.manufacturerName || user.name}
                        </p>
                        <p className="text-sm text-[var(--caption-color)] truncate font-satoshi">
                          {user.email}
                        </p>
                        <span className="inline-block px-2 py-1 text-xs bg-[var(--primary)]/10 text-[var(--primary)] rounded-full font-satoshi-medium mt-1">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Actions */}
                  <div className="py-2">
                    {menuActions.map((action) => (
                      action.separator ? (
                        <div key={action.id} className="my-2 border-t border-[var(--border)]" />
                      ) : (
                        <button
                          key={action.id}
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-satoshi transition-colors text-left",
                            action.variant === 'destructive' 
                              ? "text-[var(--error)] hover:bg-[var(--error)]/10" 
                              : "text-[var(--heading-color)] hover:bg-[var(--background-secondary)]",
                            action.disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {action.icon && (
                            <span className="flex-shrink-0">
                              {action.icon}
                            </span>
                          )}
                          <span className="flex-1">{action.label}</span>
                          {action.badge && (
                            <span className="px-2 py-1 text-xs bg-[var(--primary)] text-white rounded-full font-satoshi-bold">
                              {action.badge}
                            </span>
                          )}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }
);

PageHeader.displayName = "PageHeader";

export { PageHeader };