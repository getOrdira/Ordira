// src/hooks/use-auth.ts

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { config } from '@/lib/config';
import { 
  LoginCredentials, 
  BusinessLoginCredentials,
  RegisterUserData, 
  RegisterBusinessData, 
  RegisterManufacturerData,
  AuthResponse,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  EmailVerificationData
} from '@/lib/types/auth';
import { AnyUser } from '@/lib/types/user';
import { authApi } from '@/lib/api/auth';

interface AuthState {
  user: AnyUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  // Authentication actions
  login: (credentials: LoginCredentials | BusinessLoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  
  // Registration actions
  registerUser: (data: RegisterUserData) => Promise<AuthResponse>;
  registerBusiness: (data: RegisterBusinessData) => Promise<AuthResponse>;
  registerManufacturer: (data: RegisterManufacturerData) => Promise<AuthResponse>;
  
  // Verification
  verifyEmail: (data: EmailVerificationData) => Promise<AuthResponse>;
  resendVerification: (email: string) => Promise<void>;
  
  // Password management
  changePassword: (data: ChangePasswordData) => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  
  // User data management
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<AnyUser>) => Promise<void>;
  
  // Utilities
  clearError: () => void;
}

/**
 * Main authentication hook
 * Handles all authentication state and actions
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Check if user is authenticated on mount
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!getStoredToken(),
  });

  // Update auth state when user data changes
  useEffect(() => {
    setAuthState(prev => ({
      ...prev,
      user: currentUser || null,
      isLoading: userLoading,
      isAuthenticated: !!currentUser,
    }));
  }, [currentUser, userLoading]);

  // Clear error helper
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Set error helper
  const setError = useCallback((error: string) => {
    setAuthState(prev => ({ ...prev, error }));
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials | BusinessLoginCredentials) => {
      clearError();
      
      // Determine login type and call appropriate API
      if ('emailOrPhone' in credentials) {
        return authApi.loginBusiness(credentials);
      } else {
        return authApi.loginUser(credentials);
      }
    },
    onSuccess: (response: AuthResponse) => {
      if (response.success && response.token && response.user) {
        storeToken(response.token);
        if (response.refreshToken) {
          storeRefreshToken(response.refreshToken);
        }
        
        // Update query cache
        queryClient.setQueryData(['auth', 'me'], response.user);
        
        // Navigate based on user role
        navigateByRole(response.user);
      } else {
        setError(response.message || 'Login failed');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Login failed');
    }
  });

  // Register user mutation
  const registerUserMutation = useMutation({
    mutationFn: async (data: RegisterUserData) => {
      clearError();
      return authApi.registerUser(data);
    },
    onSuccess: (response: AuthResponse) => {
      if (response.success) {
        router.push('/auth/verify-email?type=user');
      } else {
        setError(response.message || 'Registration failed');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Registration failed');
    }
  });

  // Register business mutation
  const registerBusinessMutation = useMutation({
    mutationFn: async (data: RegisterBusinessData) => {
      clearError();
      return authApi.registerBusiness(data);
    },
    onSuccess: (response: AuthResponse) => {
      if (response.success) {
        router.push('/auth/verify-email?type=business');
      } else {
        setError(response.message || 'Registration failed');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Registration failed');
    }
  });

  // Register manufacturer mutation
  const registerManufacturerMutation = useMutation({
    mutationFn: async (data: RegisterManufacturerData) => {
      clearError();
      return authApi.registerManufacturer(data);
    },
    onSuccess: (response: AuthResponse) => {
      if (response.success) {
        router.push('/auth/verify-email?type=manufacturer');
      } else {
        setError(response.message || 'Registration failed');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Registration failed');
    }
  });

  // Email verification mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (data: EmailVerificationData) => {
      clearError();
      // Use smart verify to determine the correct API call
      await authApi.verifyUser(data);
      // Return a mock AuthResponse since verifyUser returns void
      return {
        success: true,
        message: 'Email verified successfully',
        user: currentUser || undefined
      } as AuthResponse;
    },
    onSuccess: (response: AuthResponse) => {
      if (response.success && response.token && response.user) {
        storeToken(response.token);
        if (response.refreshToken) {
          storeRefreshToken(response.refreshToken);
        }
        
        queryClient.setQueryData(['auth', 'me'], response.user);
        navigateByRole(response.user);
      } else {
        setError(response.message || 'Email verification failed');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Email verification failed');
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      clearError();
      return authApi.changePassword(data);
    },
    onSuccess: () => {
      // Password changed successfully
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to change password');
    }
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      clearError();
      return authApi.forgotPassword(data);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to send reset email');
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      clearError();
      return authApi.resetPassword(data);
    },
    onSuccess: () => {
      router.push('/auth/login?message=password-reset-success');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to reset password');
    }
  });

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Log error but continue with logout
      console.error('Logout API error:', error);
    }
    
    // Clear tokens and cache regardless of API call result
    clearStoredTokens();
    queryClient.removeQueries({ queryKey: ['auth'] });
    queryClient.clear(); // Clear all cached data
    
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    });
    
    router.push('/auth/login');
  }, [router, queryClient]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [queryClient]);

  // Update profile - using a mock implementation since updateProfile doesn't exist in auth API
  const updateProfile = useCallback(async (updates: Partial<AnyUser>) => {
    try {
      clearError();
      // Since updateProfile doesn't exist in auth API, we'll use a mock implementation
      // In a real app, this would call the appropriate API endpoint
      console.warn('updateProfile not implemented in auth API');
      
      // For now, just update the cache with the new data
      const currentUser = queryClient.getQueryData(['auth', 'me']) as AnyUser;
      if (currentUser) {
        const updatedUser = { ...currentUser, ...updates };
        queryClient.setQueryData(['auth', 'me'], updatedUser);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    }
  }, [queryClient, clearError, setError]);

  // Resend verification
  const resendVerification = useCallback(async (email: string) => {
    try {
      clearError();
      await authApi.resendVerification({ email, emailCode: '' });
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification');
    }
  }, [clearError, setError]);

  return {
    // State
    ...authState,
    
    // Actions
    login: loginMutation.mutateAsync,
    logout,
    
    registerUser: registerUserMutation.mutateAsync,
    registerBusiness: registerBusinessMutation.mutateAsync,
    registerManufacturer: registerManufacturerMutation.mutateAsync,
    
    verifyEmail: verifyEmailMutation.mutateAsync,
    resendVerification,
    
    changePassword: changePasswordMutation.mutateAsync,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    
    refreshUser,
    updateProfile,
    
    clearError,
  };
}

/**
 * Hook for checking authentication status
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    isGuest: !isAuthenticated && !isLoading,
    userRole: user?.role,
  };
}

/**
 * Hook for requiring authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook for role-based access control
 */
export function useRequireRole(allowedRoles: string | string[], redirectTo: string = '/') {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hasRequiredRole = user && roles.includes(user.role);

  useEffect(() => {
    if (!isLoading && user && !hasRequiredRole) {
      router.push(redirectTo);
    }
  }, [user, isLoading, hasRequiredRole, router, redirectTo]);

  return { hasRequiredRole, isLoading };
}

// Utility functions for token management
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(config.auth.tokenKey);
}

function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(config.auth.tokenKey, token);
}

function storeRefreshToken(refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(config.auth.refreshTokenKey, refreshToken);
}

function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(config.auth.tokenKey);
  localStorage.removeItem(config.auth.refreshTokenKey);
}

function navigateByRole(user: AnyUser): void {
  const router = useRouter();
  
  switch (user.role) {
    case 'brand':
      router.push('/brand/dashboard');
      break;
    case 'manufacturer':
      router.push('/manufacturer/dashboard');
      break;
    case 'customer':
      router.push('/vote');
      break;
    default:
      router.push('/');
  }
}