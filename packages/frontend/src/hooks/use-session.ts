// src/hooks/use-session.ts

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/session';
import { AnyUser } from '@/lib/typessss/user';
import * as authApi from '@/lib/apis/auth';

interface SessionState {
  user: AnyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseSessionReturn extends SessionState {
  // Session management
  refreshSession: () => Promise<void>;
  clearSession: () => void;
  
  // Token management
  getAccessToken: () => string | null;
  getRefreshTokenValue: () => string | null;
  
  // Session validation
  isSessionValid: () => boolean;
  isTokenExpired: () => boolean;
  
  // User role helpers
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccess: (resource: string) => boolean;
}

export function useSession(): UseSessionReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [sessionState, setSessionState] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Fetch user profile on mount and when token changes
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }
      return authApi.authApi.getCurrentUser();
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if ((error as any)?.statusCode === 401) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!getToken(),
  });

  // Update session state when user data changes
  useEffect(() => {
    setSessionState(prev => ({
      ...prev,
      user: user || null,
      isAuthenticated: !!user,
      isLoading,
      error: error?.message || null,
    }));
  }, [user, isLoading, error]);

  // Refresh session by refetching user data
  const refreshSession = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    } catch (error) {
      console.error('Failed to refresh session:', error);
      clearSession();
    }
  }, [queryClient]);

  // Clear session and redirect to login
  const clearSession = useCallback(() => {
    clearTokens();
    setSessionState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    queryClient.clear();
    router.push('/auth/login');
  }, [queryClient, router]);

  // Get access token
  const getAccessToken = useCallback(() => {
    return getToken();
  }, []);

  // Get refresh token
  const getRefreshTokenValue = useCallback(() => {
    return getRefreshToken();
  }, []);

  // Check if session is valid
  const isSessionValid = useCallback(() => {
    const token = getToken();
    if (!token) return false;
    
    try {
      // Basic JWT token validation (check if it's expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    const token = getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp <= now;
    } catch {
      return true;
    }
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: string) => {
    return sessionState.user?.role === role;
  }, [sessionState.user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roles: string[]) => {
    return sessionState.user ? roles.includes(sessionState.user.role) : false;
  }, [sessionState.user]);

  // Check if user can access specific resource
  const canAccess = useCallback((resource: string) => {
    if (!sessionState.user) return false;
    
    // Define resource-based access rules
    const accessRules: Record<string, string[]> = {
      'admin': ['admin'],
      'brand-dashboard': ['brand', 'creator'],
      'manufacturer-dashboard': ['manufacturer'],
      'customer-dashboard': ['customer'],
      'analytics': ['brand', 'creator', 'manufacturer'],
      'settings': ['brand', 'creator', 'manufacturer'],
      'billing': ['brand', 'creator', 'manufacturer'],
    };
    
    const allowedRoles = accessRules[resource] || [];
    return hasAnyRole(allowedRoles);
  }, [sessionState.user, hasAnyRole]);

  return {
    ...sessionState,
    refreshSession,
    clearSession,
    getAccessToken,
    getRefreshTokenValue,
    isSessionValid,
    isTokenExpired,
    hasRole,
    hasAnyRole,
    canAccess,
  };
}
