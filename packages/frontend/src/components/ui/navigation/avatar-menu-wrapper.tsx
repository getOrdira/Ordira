// src/components/ui/navigation/avatar-menu-wrapper.tsx
'use client';

import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Import our hook and existing UI components
import { useAvatarMenu } from '@/hooks/use-avatar-menu';
import { UserProfileDropdown } from './use-avatar-menu';

interface AvatarMenuWrapperProps {
  className?: string;
  /** Show quick stats in the dropdown */
  showStats?: boolean;
  /** Show user info section in dropdown */
  showUserInfo?: boolean;
  /** Custom avatar size */
  avatarSize?: 'sm' | 'md' | 'lg';
  /** Show chevron icon */
  showChevron?: boolean;
  /** Custom trigger component (overrides default) */
  customTrigger?: React.ReactNode;
  /** Custom menu items (appended to default ones) */
  customMenuItems?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
  /** Hide default menu items */
  hideDefaultItems?: string[];
  /** Callback when avatar is clicked for upload */
  onAvatarUpload?: (file: File) => void;
  /** Show upload progress */
  showUploadProgress?: boolean;
}

export function AvatarMenuWrapper({
  className,
  showStats = true,
  showUserInfo = true,
  avatarSize = 'md',
  showChevron = true,
  customTrigger,
  customMenuItems = [],
  hideDefaultItems = [],
  onAvatarUpload,
  showUploadProgress = true,
}: AvatarMenuWrapperProps) {
  const {
    user,
    userStats,
    isOpen,
    loading,
    error,
    uploadingAvatar,
    uploadProgress,
    toggleMenu,
    closeMenu,
    openMenu,
    refreshProfile,
    uploadNewAvatar,
    removeUserAvatar,
    menuActions,
    quickStats,
    getInitials,
    formatLastLogin,
  } = useAvatarMenu();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar size configuration
  const avatarSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const avatarTextSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Handle avatar click for upload
  const handleAvatarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAvatarUpload) {
      fileInputRef.current?.click();
    }
  }, [onAvatarUpload]);

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onAvatarUpload) {
        onAvatarUpload(file);
      } else {
        await uploadNewAvatar(file);
      }
    }
    // Reset input
    e.target.value = '';
  }, [onAvatarUpload, uploadNewAvatar]);

  // Render avatar with upload functionality
  const renderAvatar = useCallback(() => {
    const baseClasses = cn(
      avatarSizeClasses[avatarSize],
      'rounded-full object-cover ring-2 ring-gray-100 transition-all duration-200',
      onAvatarUpload && 'cursor-pointer hover:ring-primary',
      uploadingAvatar && 'opacity-70'
    );

    if (user?.avatar) {
      return (
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.name}
            className={baseClasses}
            onClick={handleAvatarClick}
          />
          {uploadingAvatar && showUploadProgress && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <div className="text-white text-xs font-medium">
                {uploadProgress}%
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback to initials
    return (
      <div
        className={cn(
          baseClasses,
          'bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-satoshi-medium',
          avatarTextSizeClasses[avatarSize]
        )}
        onClick={handleAvatarClick}
      >
        {user ? getInitials(user.name) : '??'}
        {uploadingAvatar && showUploadProgress && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="text-white text-xs font-medium">
              {uploadProgress}%
            </div>
          </div>
        )}
      </div>
    );
  }, [
    user,
    avatarSize,
    uploadingAvatar,
    uploadProgress,
    showUploadProgress,
    onAvatarUpload,
    getInitials,
    handleAvatarClick,
  ]);

  // Filter menu actions based on hideDefaultItems
  const filteredMenuActions = menuActions.filter(
    action => !hideDefaultItems.includes(action.id)
  );

  // Add custom menu items before logout
  const finalMenuActions = [...filteredMenuActions];
  if (customMenuItems.length > 0) {
    // Find the index of logout to insert custom items before it
    const logoutIndex = finalMenuActions.findIndex(item => item.id === 'logout');
    const insertIndex = logoutIndex > -1 ? logoutIndex : finalMenuActions.length;
    
    // Add separator if needed
    if (insertIndex > 0 && !finalMenuActions[insertIndex - 1]?.separator) {
      finalMenuActions.splice(insertIndex, 0, {
        id: 'custom-divider',
        label: '',
        separator: true,
      });
    }
    
    // Add custom items
    const customActions = customMenuItems.map(item => ({
      ...item,
      onClick: item.onClick,
    }));
    finalMenuActions.splice(insertIndex + 1, 0, ...customActions);
  }

  // Default trigger if none provided
  const defaultTrigger = (
    <button 
      className={cn(
        "flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
        loading && "opacity-70 cursor-wait",
        className
      )}
      disabled={loading}
      aria-label="User menu"
    >
      {renderAvatar()}
      {showChevron && (
        <ChevronDownIcon className={cn(
          "w-4 h-4 text-[var(--muted)] transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      )}
    </button>
  );

  // Don't render if no user data
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Hidden file input for avatar upload */}
      {onAvatarUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* User Profile Dropdown using existing component */}
      <UserProfileDropdown
        user={{
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        }}
        onProfileClick={() => {
          const profileAction = finalMenuActions.find(a => a.id === 'profile');
          profileAction?.onClick?.();
        }}
        onInviteClick={() => {
          // Custom invite logic or navigate to invite page
          console.log('Invite friends clicked');
        }}
        onSettingsClick={() => {
          const settingsAction = finalMenuActions.find(a => a.id === 'settings');
          settingsAction?.onClick?.();
        }}
        onSupportClick={() => {
          const supportAction = finalMenuActions.find(a => a.id === 'support');
          supportAction?.onClick?.();
        }}
        onLogoutClick={() => {
          const logoutAction = finalMenuActions.find(a => a.id === 'logout');
          logoutAction?.onClick?.();
        }}
        className={className}
      />

      {/* Custom Enhanced Dropdown (Alternative Implementation) */}
      {/* 
      <div className="relative">
        {customTrigger || defaultTrigger}
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-2">
            {showUserInfo && (
              <>
                <div className="px-4 py-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    {renderAvatar()}
                    <div className="flex-1 min-w-0">
                      <div className="font-satoshi-medium text-[var(--ordira-accent)] text-base truncate">
                        {user.name}
                      </div>
                      <div className="text-sm font-satoshi-regular text-[var(--muted)] truncate">
                        {user.email}
                      </div>
                      {user.businessName && (
                        <div className="text-xs font-satoshi-regular text-[var(--muted)] truncate">
                          {user.businessName}
                        </div>
                      )}
                    </div>
                    {!user.isEmailVerified && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Unverified
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {showStats && quickStats.length > 0 && (
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      {quickStats.map((stat, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {stat.icon && (
                            <div className="text-[var(--muted)]">
                              {stat.icon}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                              {stat.value}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {stat.label}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="py-2">
              {finalMenuActions.map((action, index) => {
                if (action.separator) {
                  return (
                    <div key={action.id} className="border-t border-gray-100 my-2 mx-2" />
                  );
                }

                return (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 text-sm font-satoshi-regular transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 rounded-lg mx-2 w-full text-left",
                      action.variant === 'destructive'
                        ? "text-[var(--error)] hover:bg-[var(--error)]/5"
                        : "text-[var(--ordira-accent)] hover:bg-gray-50 hover:text-[var(--primary)]"
                    )}
                  >
                    {action.icon && (
                      <div className="w-5 h-5 text-[var(--muted)]">
                        {action.icon}
                      </div>
                    )}
                    <span>{action.label}</span>
                    {action.badge && (
                      <span className="ml-auto bg-[var(--primary)] text-white text-xs rounded-full px-2 py-1">
                        {action.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="px-4 py-2 border-t border-gray-100">
                <div className="text-xs text-[var(--error)] bg-red-50 rounded-lg p-2">
                  {error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      */}
    </>
  );
}

// Enhanced Avatar Menu with additional features
interface EnhancedAvatarMenuProps extends AvatarMenuWrapperProps {
  /** Show profile completion progress */
  showProfileCompletion?: boolean;
  /** Show subscription status */
  showSubscriptionStatus?: boolean;
  /** Enable avatar upload on click */
  enableAvatarUpload?: boolean;
}

export function EnhancedAvatarMenu({
  showProfileCompletion = true,
  showSubscriptionStatus = true,
  enableAvatarUpload = true,
  ...props
}: EnhancedAvatarMenuProps) {
  const {
    user,
    uploadNewAvatar,
  } = useAvatarMenu();

  const handleAvatarUpload = useCallback(async (file: File) => {
    await uploadNewAvatar(file);
  }, [uploadNewAvatar]);

  return (
    <AvatarMenuWrapper
      {...props}
      onAvatarUpload={enableAvatarUpload ? handleAvatarUpload : undefined}
      customMenuItems={[
        ...(props.customMenuItems || []),
        // Add profile completion if needed
        ...(showProfileCompletion && user?.profileCompleteness && user.profileCompleteness < 100 ? [{
          id: 'complete-profile',
          label: `Complete Profile (${user.profileCompleteness}%)`,
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          onClick: () => {
            // Navigate to profile completion
            if (user?.role === 'brand') {
              window.location.href = '/brand/account/settings/profile';
            } else if (user?.role === 'manufacturer') {
              window.location.href = '/manufacturer/account/settings/profile';
            }
          },
        }] : []),
      ]}
    />
  );
}

// Export for use in header components
export default AvatarMenuWrapper;
