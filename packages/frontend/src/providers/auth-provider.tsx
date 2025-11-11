// src/providers/auth-provider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AnyUser } from '@/lib/types/features/users';
import type { LoginCredentials, AuthResponse } from '@/lib/types/features/auth';
import {
  getToken,
  setTokens,
  clearTokens,
  isTokenExpired,
  getRefreshToken,
  updateStoredUserData
} from '@/lib/auth/session/session';
import authApi from '@/lib/api/core/auth.api';
import { ApiError } from '@/lib/errors/errors';
import { authQueryKeys } from '@/hooks/core/useAuth';

// Define the shape of the authentication context
interface AuthContextType {
  user: AnyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

type StoredUserSnapshot = {
  id: string;
  email: string;
  role: AnyUser['role'];
  isEmailVerified: boolean;
  plan?: string;
  tenant?: unknown;
};

const mapUserToStoredSnapshot = (user: AnyUser | null): StoredUserSnapshot | undefined => {
  if (!user) {
    return undefined;
  }

  const snapshot: StoredUserSnapshot = {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  };

  if ('plan' in user && user.plan) {
    snapshot.plan = user.plan;
  }

  if (user.role === 'brand') {
    snapshot.tenant = {
      businessId: user.businessId,
      businessName: user.businessName,
    };
  } else if (user.role === 'manufacturer') {
    snapshot.tenant = {
      manufacturerId: user.manufacturerId,
      manufacturerName: user.manufacturerName,
    };
  }

  return snapshot;
};

/**
 * Provides authentication state and functions to its children.
 * It handles session initialization, login, logout, and user profile fetching.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AnyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  const syncAuthQueries = useCallback(
    (nextUser: AnyUser | null) => {
      if (nextUser) {
        queryClient.setQueryData(authQueryKeys.profile(), nextUser);
        queryClient.setQueryData(authQueryKeys.currentUser(), nextUser);
      } else {
        queryClient.removeQueries({ queryKey: authQueryKeys.profile() });
        queryClient.removeQueries({ queryKey: authQueryKeys.currentUser() });
      }

      queryClient.removeQueries({ queryKey: authQueryKeys.securitySettings() });
    },
    [queryClient]
  );

  const syncAuthState = useCallback(
    (nextUser: AnyUser | null, tokens?: { token?: string; refreshToken?: string }) => {
      setUser(nextUser);
      setIsLoading(false);
      syncAuthQueries(nextUser);

      const snapshot = mapUserToStoredSnapshot(nextUser);
      if (!snapshot) {
        return;
      }

      if (tokens?.token && tokens.refreshToken) {
        setTokens(tokens.token, tokens.refreshToken, snapshot);
      } else {
        updateStoredUserData(snapshot);
      }
    },
    [syncAuthQueries]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Even if server logout fails, continue with client cleanup
      console.error('Server logout failed:', error);
    } finally {
      syncAuthState(null);
      clearTokens('logout');
      queryClient.clear();
      router.push('/auth/login');
    }
  }, [queryClient, router, syncAuthState]);

  /**
   * Fetches the current user's profile from the backend if a token exists.
   * This function is memoized with useCallback to prevent re-creation on every render.
   */
  const fetchUserProfile = useCallback(async () => {
    const token = getToken();

    if (!token) {
      syncAuthState(null);
      return;
    }

    if (isTokenExpired(token)) {
      const refreshToken = getRefreshToken();
      if (!refreshToken || isTokenExpired(refreshToken)) {
        await logout();
        return;
      }

      try {
        await authApi.refreshToken();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        await logout();
        return;
      }
    }

    try {
      const userResponse = await authApi.getCurrentUser();
      syncAuthState(userResponse);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      const apiError = error as ApiError;

      // Only logout on authentication errors, not network errors
      if (apiError.statusCode === 401 || apiError.statusCode === 403) {
        await logout();
        return;
      }

      syncAuthState(null);
    } finally {
      setIsLoading(false);
    }
  }, [logout, syncAuthState]);

  // On initial component mount, try to fetch the user profile.
  useEffect(() => {
    void fetchUserProfile();
  }, [fetchUserProfile]);

  /**
   * Handles the user login process using smart login detection.
   * @param credentials - The user's email/password and optional settings.
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const response: AuthResponse = await authApi.login(credentials);

        await queryClient.cancelQueries();
        queryClient.clear();

        const tokens =
          response.token && response.refreshToken
            ? { token: response.token, refreshToken: response.refreshToken }
            : undefined;

        let currentUser: AnyUser;
        try {
          currentUser = await authApi.getCurrentUser();
        } catch (profileError) {
          console.error('Failed to fetch user profile after login:', profileError);

          const profileApiError = profileError as ApiError;
          const profileMessage =
            profileError instanceof Error
              ? profileError.message
              : profileApiError?.message || 'Login failed. Unable to fetch user profile.';

          throw new Error(profileMessage);
        }

        syncAuthState(currentUser, tokens);

        let redirectPath = '/';
        switch (currentUser.role) {
          case 'brand':
            redirectPath = '/brand/dashboard';
            break;
          case 'manufacturer':
            redirectPath = '/manufacturer/dashboard';
            break;
          case 'customer': {
            const params =
              typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const redirectTo = params?.get('redirect');

            if (
              redirectTo &&
              (redirectTo.startsWith('/vote') ||
                redirectTo.startsWith('/proposals') ||
                redirectTo.startsWith('/certificate'))
            ) {
              redirectPath = redirectTo;
            } else {
              redirectPath = '/gate';
            }
            break;
          }
          default:
            redirectPath = '/';
        }

        router.push(redirectPath);
      } catch (error) {
        console.error('Login error:', error);
        clearTokens('login_failed');
        syncAuthState(null);

        const apiError = error as ApiError;
        const message =
          error instanceof Error
            ? error.message
            : apiError?.message || 'Login failed. Please check your credentials.';

        throw new Error(message);
      }
    },
    [queryClient, router, syncAuthState]
  );

  /**
   * Refreshes the current user's profile data
   */
  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      return;
    }

    try {
      const userResponse = await authApi.getCurrentUser();
      syncAuthState(userResponse);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      const apiError = error as ApiError;

      if (apiError.statusCode === 401 || apiError.statusCode === 403) {
        await logout();
      }
    }
  }, [logout, syncAuthState]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to easily access the authentication context.
 * Throws an error if used outside of an AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};