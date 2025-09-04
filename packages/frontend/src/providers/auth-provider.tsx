// src/providers/auth-provider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AnyUser } from '@/lib/types/user';
import { LoginCredentials, AuthResponse } from '@/lib/types/auth';
import { tokenUtils } from '@/lib/auth/auth-utils';
import { authApi, authHelpers } from '@/lib/api/auth';
import { ApiError } from '@/lib/types/common';

// Define the shape of the authentication context
interface AuthContextType {
  user: AnyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides authentication state and functions to its children.
 * It handles session initialization, login, logout, and user profile fetching.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AnyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  /**
   * Fetches the current user's profile from the backend if a token exists.
   * This function is memoized with useCallback to prevent re-creation on every render.
   */
  const fetchUserProfile = useCallback(async () => {
    const token = tokenUtils.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Check if token is expired before making the request
    if (tokenUtils.isTokenExpired(token)) {
      // Try to refresh token
      const refreshToken = tokenUtils.getRefreshToken();
      if (refreshToken && !tokenUtils.isTokenExpired(refreshToken)) {
        try {
          const response = await authApi.refreshToken();
          tokenUtils.setTokens(response.token, response.refreshToken);
          
          // Fetch user profile with new token
          if (response.user) {
            setUser(response.user);
          } else {
            const userResponse = await authApi.getCurrentUser();
            setUser(userResponse);
          }
          setIsLoading(false);
          return;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          logout();
          return;
        }
      } else {
        logout();
        return;
      }
    }

    try {
      const userResponse = await authApi.getCurrentUser();
      setUser(userResponse);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      const apiError = error as ApiError;
      
      // Only logout on authentication errors, not network errors
      if (apiError.statusCode === 401 || apiError.statusCode === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On initial component mount, try to fetch the user profile.
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  /**
   * Handles the user login process using smart login detection.
   * @param credentials - The user's email/password and optional settings.
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      // Use smart login to detect user type and route to appropriate endpoint
      const response: AuthResponse = await authHelpers.smartLogin(credentials);
      
      if (response.success && response.token && response.user) {
        const { user, token, refreshToken } = response;
        setUser(user);
        
        // Store tokens using the utility functions
        tokenUtils.setTokens(token, refreshToken);

        // Clear any existing query cache to ensure fresh data
        queryClient.clear();

        // --- DYNAMIC REDIRECT BASED ON USER ROLE ---
        switch (user.role) {
          case 'brand':
            router.push('/brand/dashboard');
            break;
          case 'manufacturer':
            router.push('/manufacturer/dashboard');
            break;
          case 'customer':
            // For customers, redirect to voting gate or specific proposal
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect');
            if (redirectTo && (redirectTo.startsWith('/vote') || redirectTo.startsWith('/proposals') || redirectTo.startsWith('/certificate'))) {
              router.push(redirectTo);
            } else {
              router.push('/gate');
            }
            break;
          default:
            // Fallback redirect if the role is unknown
            console.warn('Unknown user role:', user.role);
            router.push('/');
            break;
        }
      } else {
        throw new Error(response.message || 'Login failed - invalid response');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Clear any potentially corrupted tokens
      tokenUtils.clearTokens();
      setUser(null);
      
      // Re-throw with user-friendly message
      if (error instanceof Error) {
        throw error;
      }
      
      const apiError = error as ApiError;
      throw new Error(apiError.message || 'Login failed. Please check your credentials.');
    }
  };

  /**
   * Refreshes the current user's profile data
   */
  const refreshUser = useCallback(async () => {
    if (!tokenUtils.getToken()) {
      return;
    }
    
    try {
      const userResponse = await authApi.getCurrentUser();
      setUser(userResponse);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      const apiError = error as ApiError;
      
      if (apiError.statusCode === 401 || apiError.statusCode === 403) {
        logout();
      }
    }
  }, []);

  /**
   * Handles the user logout process.
   */
  const logout = useCallback(async () => {
    try {
      // Attempt to logout on server (invalidate session)
      await authApi.logout();
    } catch (error) {
      // Even if server logout fails, continue with client cleanup
      console.error('Server logout failed:', error);
    }
    
    // Clear client-side state
    setUser(null);
    tokenUtils.clearTokens();
    queryClient.clear();
    
    // Redirect to login page
    router.push('/auth/login');
  }, [queryClient, router]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

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