// src/components/navigation/BaseHeader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { 
  Bell, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Building2, 
  CreditCard, 
  HelpCircle,
  User,
  Shield,
  FileText,
  Plus
} from 'lucide-react';
import { VerificationBadge } from '@/components/ui/data-display/status-badge';
import { useNotifications } from '@/hooks/use-notifications';
import { useAvatarMenu } from '@/hooks/use-avatar-menu';
import { AnyUser } from '@/lib/types/user';
import { cn } from '@/lib/utils';

interface BaseHeaderProps {
  user: AnyUser;
  className?: string;
}

export function BaseHeader({ user, className }: BaseHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();
  
  // Use real hooks instead of mock data
  const {
    notifications,
    stats,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  const {
    isOpen: isAvatarOpen,
    toggleMenu: toggleAvatarMenu,
    closeMenu: closeAvatarMenu,
    menuActions,
    getInitials,
    uploadingAvatar,
    uploadNewAvatar,
  } = useAvatarMenu();
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        closeAvatarMenu();
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
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

  // Get user display name based on role
  const getUserDisplayName = (): string => {
    switch (user.role) {
      case 'brand':
        return (user as any).businessName || 'Brand Account';
      case 'manufacturer':
        return (user as any).name || 'Manufacturer Account';
      case 'creator':
        return (user as any).name || 'Creator Account';
      case 'customer':
        return (user as any).firstName && (user as any).lastName 
          ? `${(user as any).firstName} ${(user as any).lastName}` 
          : 'Customer Account';
      default:
        return 'Account';
    }
  };

  // Get user name for initials
  const getUserName = (): string => {
    if (user.role === 'brand') {
      return (user as any).businessName || user.email.split('@')[0];
    } else if (user.role === 'manufacturer') {
      return (user as any).name || user.email.split('@')[0];
    } else if (user.role === 'creator') {
      return (user as any).name || user.email.split('@')[0];
    } else if (user.role === 'customer') {
      const firstName = (user as any).firstName;
      const lastName = (user as any).lastName;
      return firstName && lastName ? `${firstName} ${lastName}` : user.email.split('@')[0];
    }
    return user.email.split('@')[0];
  };

  // Check if user is verified
  const isUserVerified = (): boolean => {
    return (user as any).isVerified || (user as any).isEmailVerified || false;
  };

  // Get verification badge user type
  const getVerificationUserType = (): 'brand' | 'manufacturer' | undefined => {
    if (user.role === 'brand' || user.role === 'creator') return 'brand';
    if (user.role === 'manufacturer') return 'manufacturer';
    return undefined;
  };

  // Get notifications page URL based on user role
  const getNotificationsUrl = (): string => {
    return `/${user.role}/notifications`;
  };

  return (
    <header className={`flex items-center justify-end px-6 py-4 bg-white border-b border-gray-200 ${className || ''}`}>
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {stats.hasUnread && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--ordira-primary)] text-white text-xs rounded-full flex items-center justify-center font-satoshi-bold">
                {stats.unread > 9 ? '9+' : stats.unread}
              </span>
            )}
          </button>

          {/* Notifications Dropdown - Using real notification data */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-satoshi-bold text-gray-900">Notifications</h3>
                {stats.hasUnread && (
                  <button 
                    onClick={() => markAllAsRead()}
                    className="text-sm text-[var(--ordira-primary)] hover:text-[var(--ordira-primary-dark)] font-satoshi-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 6).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={cn(
                      "p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                      !notification.read && "bg-[var(--ordira-primary)]/5"
                    )}
                  >
                    <div className="flex items-start">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 mr-3",
                        !notification.read ? "bg-[var(--ordira-primary)]" : "bg-gray-300"
                      )} />
                      <div className="flex-1">
                        {notification.title && (
                          <p className="font-satoshi-bold text-gray-900 text-sm">
                            {notification.title}
                          </p>
                        )}
                        <p className="text-gray-600 text-sm mt-1 font-satoshi-regular">
                          {notification.message}
                        </p>
                        <p className="text-gray-400 text-xs mt-2 font-satoshi-regular">
                          {notification.time}
                        </p>
                      </div>
                      
                      {/* Notification Actions */}
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
                                action.variant === 'primary' && "bg-[var(--ordira-primary)] text-white hover:bg-[var(--ordira-primary-dark)]",
                                action.variant === 'destructive' && "bg-red-600 text-white hover:bg-red-700",
                                (!action.variant || action.variant === 'secondary') && "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-satoshi-regular">No notifications</p>
                </div>
              )}
            </div>
            {notifications.length > 6 && (
              <div className="p-4 border-t border-gray-200">
                <Link
                  href={getNotificationsUrl()}
                  className="text-sm text-[var(--ordira-primary)] hover:text-[var(--ordira-primary-dark)] font-satoshi-medium transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            )}
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={toggleAvatarMenu}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="relative">
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-[var(--ordira-primary)] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-satoshi-bold">
                    {getInitials(getUserName())}
                  </span>
                </div>
              )}
              
              {/* Upload indicator */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              
              {/* Verification badge for verified users */}
              {isUserVerified() && (
                <div className="absolute -bottom-1 -right-1">
                  <VerificationBadge
                    isVerified={true}
                    userType={getVerificationUserType()}
                    size="sm"
                    hideWhenUnverified={false}
                  />
                </div>
              )}
            </div>
            
            <div className="hidden md:block text-left">
              <p className="text-sm font-satoshi-bold text-gray-900">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-gray-500 font-satoshi-regular">
                {user.email}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* User Dropdown Menu - Using real avatar menu */}
          {isAvatarOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 font-satoshi">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {user.profilePictureUrl ? (
                      <img
                        src={user.profilePictureUrl}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[var(--ordira-primary)] rounded-full flex items-center justify-center">
                        <span className="text-white font-satoshi-bold">
                          {getInitials(getUserName())}
                        </span>
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--ordira-primary)] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--ordira-primary-dark)] transition-colors">
                      <Plus className="w-3 h-3 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {/* Verification badge */}
                    {isUserVerified() && (
                      <div className="absolute -bottom-1 -left-1">
                        <VerificationBadge
                          isVerified={true}
                          userType={getVerificationUserType()}
                          size="sm"
                          hideWhenUnverified={false}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-satoshi-bold text-gray-900 text-sm">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 truncate font-satoshi-regular">
                      {user.email}
                    </p>
                    <span className="inline-block px-2 py-1 text-xs bg-[var(--ordira-primary)]/10 text-[var(--ordira-primary)] rounded-full font-satoshi-medium mt-1">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-2">
                {menuActions.map((action) => (
                  action.separator ? (
                    <div key={action.id} className="my-2 border-t border-gray-200" />
                  ) : (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-satoshi transition-colors text-left",
                        action.variant === 'destructive' 
                          ? "text-red-600 hover:bg-red-50" 
                          : "text-gray-700 hover:bg-gray-100",
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
                        <span className="px-2 py-1 text-xs bg-[var(--ordira-primary)] text-white rounded-full font-satoshi-bold">
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
    </header>
  );
}