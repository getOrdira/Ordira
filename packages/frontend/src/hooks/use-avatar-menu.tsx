// src/hooks/use-avatar-menu.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';


// Simple toast replacement
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message)
};

// Import API functions
import { 
  getUserProfile, 
  getUserStats, 
  uploadAvatar, 
  removeAvatar,
  type UserProfile,
  type User 
} from '@/lib/apis/user';

// For brand users
import { getBrandProfile, type BrandProfile } from '@/lib/apis/brandProfile';

export interface AvatarMenuUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'brand' | 'manufacturer' | 'customer' | 'admin';
  businessName?: string;
  manufacturerName?: string;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  profileCompleteness?: number;
  subscription?: {
    plan: string;
    status: string;
  };
}

export interface UserStats {
  totalVotes: number;
  engagementScore: number;
  votingStreak?: number;
  accountAge: number;
  achievements?: number;
  certificatesEarned?: number;
  productsVoted?: number;
}

export interface AvatarMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  separator?: boolean;
  variant?: 'default' | 'primary' | 'destructive';
  disabled?: boolean;
  external?: boolean;
}

export interface UseAvatarMenuReturn {
  // State
  user: AvatarMenuUser | null;
  userStats: UserStats | null;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  
  // Avatar upload state
  uploadingAvatar: boolean;
  uploadProgress: number;
  
  // Menu state
  showUserInfo: boolean;
  
  // Actions
  toggleMenu: () => void;
  closeMenu: () => void;
  openMenu: () => void;
  
  // Profile actions
  refreshProfile: () => Promise<void>;
  uploadNewAvatar: (file: File) => Promise<void>;
  removeUserAvatar: () => Promise<void>;
  
  // Navigation actions
  navigateToProfile: () => void;
  navigateToSettings: () => void;
  navigateToBilling: () => void;
  navigateToActivity: () => void;
  navigateToSupport: () => void;
  logout: () => Promise<void>;
  
  // Menu configuration
  menuActions: AvatarMenuAction[];
  quickStats: Array<{ label: string; value: string | number; icon?: React.ReactNode; }>;
  
  // Utilities
  getInitials: (name: string) => string;
  formatLastLogin: (date?: string) => string;
}

export function useAvatarMenu(): UseAvatarMenuReturn {
  const { user: authUser, logout: authLogout, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AvatarMenuUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserInfo, setShowUserInfo] = useState(true);
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Transform auth user to avatar menu user format
  const transformAuthUser = useCallback((authUser: any): AvatarMenuUser => {
    const getName = () => {
      if (authUser.name) return authUser.name;
      if (authUser.firstName && authUser.lastName) {
        return `${authUser.firstName} ${authUser.lastName}`.trim();
      }
      if (authUser.businessName) return authUser.businessName;
      if (authUser.manufacturerName) return authUser.manufacturerName;
      return authUser.email.split('@')[0]; // Fallback to email username
    };

    return {
      id: authUser._id || authUser.id,
      name: getName(),
      email: authUser.email,
      avatar: authUser.profilePictureUrl || authUser.avatar,
      role: authUser.role || 'customer',
      businessName: authUser.businessName,
      manufacturerName: authUser.manufacturerName,
      isEmailVerified: authUser.isEmailVerified || false,
      lastLoginAt: authUser.lastLoginAt,
      profileCompleteness: authUser.profileCompleteness || 0,
      subscription: authUser.subscription || { plan: 'free', status: 'active' },
    };
  }, []);

  // Load user profile and stats
  const loadUserData = useCallback(async () => {
    if (!authUser || !isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Always set user from auth data first for immediate UI
      setUser(transformAuthUser(authUser));

      // Try to get enhanced profile data
      const profilePromise = getUserProfile().catch(() => null);
      const statsPromise = getUserStats().catch(() => null);

      const [profileResponse, statsResponse] = await Promise.allSettled([
        profilePromise,
        statsPromise,
      ]);

      // Handle profile response
      if (profileResponse.status === 'fulfilled' && profileResponse.value) {
        const enhancedUser = {
          ...transformAuthUser(authUser),
          // Merge any additional profile data
          profileCompleteness: (profileResponse.value.data?.user as any)?.profileCompleteness || 0,
        };
        setUser(enhancedUser);
      }

      // Handle stats response
      if (statsResponse.status === 'fulfilled' && statsResponse.value) {
        const stats = statsResponse.value;
        setUserStats({
          totalVotes: stats.totalVotes || 0,
          engagementScore: stats.engagementScore || 0,
          votingStreak: stats.votingStreak || 0,
          accountAge: stats.accountAge || 0,
          achievements: stats.achievements || 0,
          certificatesEarned: stats.certificatesEarned || 0,
          productsVoted: stats.productsVoted || 0,
        });
      }

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to load user data');
        console.error('Failed to load user data:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [authUser, isAuthenticated, transformAuthUser]);

  // Menu toggle actions
  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Profile actions
  const refreshProfile = useCallback(async () => {
    await Promise.all([loadUserData(), refreshUser()]);
  }, [loadUserData, refreshUser]);

  const uploadNewAvatar = useCallback(async (file: File) => {
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      toast.error('Please select a valid image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size must be less than 5MB');
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadAvatar(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        // Update user avatar immediately
        setUser(prev => prev ? { ...prev, avatar: result.avatarUrl } : null);
        
        // Refresh auth user to get updated data
        await refreshUser();
        
        toast.success('Avatar updated successfully');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(0);
    }
  }, [refreshUser]);

  const removeUserAvatar = useCallback(async () => {
    try {
      setLoading(true);
      const result = await removeAvatar();
      
      if (result.success) {
        // Update user avatar immediately
        setUser(prev => prev ? { ...prev, avatar: undefined } : null);
        
        // Refresh auth user
        await refreshUser();
        
        toast.success('Avatar removed successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
      toast.error('Failed to remove avatar');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  // Navigation actions based on user role
  const navigateToProfile = useCallback(() => {
    closeMenu();
    if (user?.role === 'brand') {
      router.push('/brand/account/settings/profile');
    } else if (user?.role === 'manufacturer') {
      router.push('/manufacturer/account/settings/profile');
    } else {
      router.push('/profile');
    }
  }, [user?.role, router, closeMenu]);

  const navigateToSettings = useCallback(() => {
    closeMenu();
    if (user?.role === 'brand') {
      router.push('/brand/account/settings');
    } else if (user?.role === 'manufacturer') {
      router.push('/manufacturer/account/settings');
    } else {
      router.push('/settings');
    }
  }, [user?.role, router, closeMenu]);

  const navigateToBilling = useCallback(() => {
    closeMenu();
    if (user?.role === 'brand') {
      router.push('/brand/account/settings/billing');
    } else if (user?.role === 'manufacturer') {
      router.push('/manufacturer/account/settings/billing');
    } else {
      router.push('/billing');
    }
  }, [user?.role, router, closeMenu]);

  const navigateToActivity = useCallback(() => {
    closeMenu();
    if (user?.role === 'brand') {
      router.push('/brand/analytics');
    } else if (user?.role === 'manufacturer') {
      router.push('/manufacturer/analytics');
    } else {
      router.push('/activity');
    }
  }, [user?.role, router, closeMenu]);

  const navigateToSupport = useCallback(() => {
    closeMenu();
    // You can customize this based on your support system
    window.open('mailto:support@yourdomain.com', '_blank');
  }, [closeMenu]);

  const logout = useCallback(async () => {
    try {
      closeMenu();
      await authLogout();
      toast.success('Logged out successfully');
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error('Failed to logout');
    }
  }, [authLogout, router, closeMenu]);

  // Generate menu actions based on user role
  const menuActions: AvatarMenuAction[] = [
    {
      id: 'profile',
      label: 'My Account',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
        </svg>
      ),
      onClick: navigateToProfile,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      onClick: navigateToSettings,
    },
  ];

  // Add role-specific actions
  if (user?.role === 'brand' || user?.role === 'manufacturer') {
    menuActions.push({
      id: 'billing',
      label: 'Billing',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h6zM4 14a2 2 0 002 2h8a2 2 0 002-2v-2H4v2z" />
        </svg>
      ),
      onClick: navigateToBilling,
    });

    menuActions.push({
      id: 'activity',
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
      onClick: navigateToActivity,
    });
  }

  // Add support action
  menuActions.push({
    id: 'support',
    label: 'Support',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.3 1.25-1.344A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
    onClick: navigateToSupport,
    external: true,
  });

  // Add separator and logout
  menuActions.push({
    id: 'divider-1',
    label: '',
    separator: true,
  });

  menuActions.push({
    id: 'logout',
    label: 'Log out',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114L8.704 10.75H18.25A.75.75 0 0019 10z" clipRule="evenodd" />
      </svg>
    ),
    onClick: logout,
    variant: 'destructive',
  });

  // Generate quick stats
  const quickStats = userStats ? [
    {
      label: 'Total Votes',
      value: userStats.totalVotes,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: 'Engagement',
      value: `${userStats.engagementScore}%`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
  ] : [];

  // Utility functions
  const getInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatLastLogin = useCallback((date?: string): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const loginDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - loginDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return loginDate.toLocaleDateString();
  }, []);

  // Load user data on mount and auth changes
  useEffect(() => {
    if (isAuthenticated && authUser) {
      loadUserData();
    } else {
      setUser(null);
      setUserStats(null);
    }
  }, [isAuthenticated, authUser, loadUserData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    user,
    userStats,
    isOpen,
    loading,
    error,
    uploadingAvatar,
    uploadProgress,
    showUserInfo,
    
    // Actions
    toggleMenu,
    closeMenu,
    openMenu,
    refreshProfile,
    uploadNewAvatar,
    removeUserAvatar,
    navigateToProfile,
    navigateToSettings,
    navigateToBilling,
    navigateToActivity,
    navigateToSupport,
    logout,
    
    // Menu configuration
    menuActions,
    quickStats,
    
    // Utilities
    getInitials,
    formatLastLogin,
  };
}