// src/lib/auth/auth-hooks.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { User } from '@/types/auth';

/**
 * Hook to require authentication - redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading, isAuthenticated: !!user };
}

/**
 * Hook to require specific user role
 */
export function useRequireRole(allowedRoles: string[], redirectTo: string = '/auth/login') {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(redirectTo);
        return;
      }

      const userHasRole = allowedRoles.includes(user.occupation);
      setHasAccess(userHasRole);

      if (!userHasRole) {
        router.push('/unauthorized');
      }
    }
  }, [user, isLoading, allowedRoles, router, redirectTo]);

  return { user, isLoading, hasAccess, isAuthenticated: !!user };
}

/**
 * Hook to require specific permissions
 */
export function useRequirePermissions(requiredPermissions: string[]) {
  const { user } = useAuth();
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user has all required permissions
      // This assumes your User type has a permissions array
      const userPermissions = (user as any).permissions || [];
      const hasAllPermissions = requiredPermissions.every(
        permission => userPermissions.includes(permission) || userPermissions.includes('*')
      );
      setHasPermissions(hasAllPermissions);
    } else {
      setHasPermissions(false);
    }
  }, [user, requiredPermissions]);

  return { hasPermissions, user };
}

/**
 * Hook to redirect authenticated users away from auth pages
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading, isAuthenticated: !!user };
}

/**
 * Hook for handling authentication state changes
 */
export function useAuthStateChange(
  onLogin?: (user: User) => void,
  onLogout?: () => void
) {
  const { user, isLoading } = useAuth();
  const [previousUser, setPreviousUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isLoading) {
      // User just logged in
      if (!previousUser && user && onLogin) {
        onLogin(user);
      }
      
      // User just logged out
      if (previousUser && !user && onLogout) {
        onLogout();
      }
      
      setPreviousUser(user);
    }
  }, [user, isLoading, previousUser, onLogin, onLogout]);

  return { user, isLoading, isAuthenticated: !!user };
}

/**
 * Hook for checking if user can access a specific feature
 */
export function useCanAccess(
  feature: string,
  requiredRole?: string,
  requiredPermissions?: string[]
) {
  const { user } = useAuth();
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (!user) {
      setCanAccess(false);
      return;
    }

    let hasAccess = true;

    // Check role requirement
    if (requiredRole && user.occupation !== requiredRole) {
      hasAccess = false;
    }

    // Check permissions requirement
    if (requiredPermissions && hasAccess) {
      const userPermissions = (user as any).permissions || [];
      const hasAllPermissions = requiredPermissions.every(
        permission => userPermissions.includes(permission) || userPermissions.includes('*')
      );
      hasAccess = hasAllPermissions;
    }

    setCanAccess(hasAccess);
  }, [user, feature, requiredRole, requiredPermissions]);

  return canAccess;
}

/**
 * Hook for user profile management
 */
export function useUserProfile() {
  const { user, refreshUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = async (updates: Partial<User>) => {
    setIsUpdating(true);
    try {
      // TODO: Implement profile update API call
      // await apiClient.put('/auth/profile', updates);
      await refreshUser();
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    user,
    isUpdating,
    updateProfile,
    refreshProfile: refreshUser,
  };
}

/**
 * Hook for session management
 */
export function useSession() {
  const { user, isLoading, logout } = useAuth();
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      // TODO: Implement session check API call
      // const response = await apiClient.get('/auth/session');
      // return response.data.valid;
      return true;
    } catch (error) {
      return false;
    }
  };

  const extendSession = async () => {
    try {
      // TODO: Implement session extension API call
      // await apiClient.post('/auth/extend-session');
      setSessionTimeoutWarning(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
      throw error;
    }
  };

  // Set up session timeout warning
  useEffect(() => {
    if (user) {
      // TODO: Set up session timeout logic based on your backend token expiry
      // const timeoutId = setTimeout(() => {
      //   setSessionTimeoutWarning(true);
      // }, 25 * 60 * 1000); // 25 minutes for 30-minute sessions

      // return () => clearTimeout(timeoutId);
    }
  }, [user]);

  return {
    user,
    isLoading,
    sessionTimeoutWarning,
    checkSession,
    extendSession,
    logout,
  };
}