// src/lib/api/core/auth.api.ts
// Authentication API module aligned with backend routes/core/auth.routes.ts

import { api } from '../client';
import type {
  LoginCredentials,
  BusinessLoginCredentials,
  RegisterUserData,
  RegisterBusinessData,
  RegisterManufacturerData,
  EmailVerificationData,
  ForgotPasswordData,
  ResetPasswordData,
  ChangePasswordData,
  SetupTwoFactorData,
  VerifyTwoFactorData,
  AccountRecoveryData,
  AuthResponse,
  TokenRefreshResponse,
  SecuritySettings
} from '@/lib/types/features/auth';
import type { ApiResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors';
import type { AnyUser } from '@/lib/types/features/users';
import { setTokens, getRefreshToken, clearTokens } from '@/lib/auth/session';

/**
 * Core Authentication API
 * 
 * Handles all authentication-related API calls.
 * Routes: /auth/*
 */
export const authApi = {
  
  // ===== CORE AUTHENTICATION (Backend routes/core/auth.routes.ts) =====
  
  /**
   * Login user
   * POST /auth/login
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      if (!response.success) {
        throw new ApiError(response.message || 'Login failed', 401);
      }
      // Store tokens if successful
      if (response.data?.token && response.data?.refreshToken) {
        setTokens(response.data.token, response.data.refreshToken);
      }
      return response.data!;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Register user
   * POST /auth/register
   */
  register: async (data: RegisterUserData | RegisterBusinessData): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Registration failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Verify email
   * POST /auth/verify
   */
  verify: async (data: EmailVerificationData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/verify', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Verification failed',  400);
      }
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    }
  },

  /**
   * Forgot password
   * POST /auth/forgot-password
   */
  forgotPassword: async (data: ForgotPasswordData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/forgot-password', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Forgot password request failed',  400);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  /**
   * Reset password
   * POST /auth/reset-password
   */
  resetPassword: async (data: ResetPasswordData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/reset-password', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Password reset failed',  400);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  /**
   * Resend verification email
   * POST /auth/resend-verification
   */
  resendVerification: async (data?: EmailVerificationData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/resend-verification', data || {});
      if (!response.success) {
        throw new ApiError(response.message || 'Resend verification failed',  400);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  },

  /**
   * Logout
   * POST /auth/logout
   */
  logout: async (): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/logout');
      if (!response.success) {
        console.warn('Server logout failed, clearing local tokens anyway');
      }
      clearTokens();
    } catch (error) {
      console.error('Logout error:', error);
      clearTokens(); // Clear local tokens even if server fails
    }
  },

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  getProfile: async (): Promise<AnyUser> => {
    try {
      const response = await api.get<ApiResponse<AnyUser>>('/auth/me');
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch user',  401);
      }
      return response.data!;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // ===== EXTENDED AUTHENTICATION (Additional endpoints) =====

  /**
   * Register a new customer/user account
   * POST /auth/register/user
   */
  registerUser: async (data: RegisterUserData): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register/user', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Registration failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('User registration error:', error);
      throw error;
    }
  },

  /**
   * Login customer/user
   * POST /auth/login/user
   */
  loginUser: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login/user', credentials);
      if (!response.success) {
        throw new ApiError(response.message || 'Login failed',  401);
      }
      // Store tokens if successful
      if (response.data?.token && response.data?.refreshToken) {
        setTokens(response.data.token, response.data.refreshToken);
      }
      return response.data!;
    } catch (error) {
      console.error('User login error:', error);
      throw error;
    }
  },

  /**
   * Verify user email address
   * POST /auth/verify/user
   */
  verifyUser: async (data: EmailVerificationData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/verify/user', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Verification failed',  400);
      }
    } catch (error) {
      console.error('User verification error:', error);
      throw error;
    }
  },

  /**
   * Register a new business/brand account
   * POST /auth/register/business
   */
  registerBusiness: async (data: RegisterBusinessData): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register/business', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Registration failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Business registration error:', error);
      throw error;
    }
  },

  /**
   * Login business account (supports email or phone)
   * POST /auth/login/business
   */
  loginBusiness: async (credentials: BusinessLoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login/business', credentials);
      if (!response.success) {
        throw new ApiError(response.message || 'Login failed',  401);
      }
      // Store tokens if successful
      if (response.data?.token && response.data?.refreshToken) {
        setTokens(response.data.token, response.data.refreshToken);
      }
      return response.data!;
    } catch (error) {
      console.error('Business login error:', error);
      throw error;
    }
  },

  /**
   * Verify business email address
   * POST /auth/verify/business
   */
  verifyBusiness: async (data: EmailVerificationData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/verify/business', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Verification failed',  400);
      }
    } catch (error) {
      console.error('Business verification error:', error);
      throw error;
    }
  },

  /**
   * Register a new manufacturer account
   * POST /manufacturer/auth/register
   */
  registerManufacturer: async (data: RegisterManufacturerData): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/manufacturer/auth/register', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Registration failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Manufacturer registration error:', error);
      throw error;
    }
  },

  /**
   * Login manufacturer account
   * POST /manufacturer/auth/login
   */
  loginManufacturer: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/manufacturer/auth/login', credentials);
      if (!response.success) {
        throw new ApiError(response.message || 'Login failed',  401);
      }
      // Store tokens if successful
      if (response.data?.token && response.data?.refreshToken) {
        setTokens(response.data.token, response.data.refreshToken);
      }
      return response.data!;
    } catch (error) {
      console.error('Manufacturer login error:', error);
      throw error;
    }
  },

  /**
   * Verify manufacturer email address
   * POST /manufacturer/auth/verify-email
   */
  verifyManufacturer: async (data: EmailVerificationData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/manufacturer/auth/verify-email', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Verification failed',  400);
      }
    } catch (error) {
      console.error('Manufacturer verification error:', error);
      throw error;
    }
  },

  /**
   * Refresh authentication token
   * POST /auth/refresh
   */
  refreshToken: async (): Promise<TokenRefreshResponse> => {
    const refreshTokenValue = getRefreshToken();
    if (!refreshTokenValue) {
      throw new ApiError('No refresh token available', 401);
    }

    try {
      const response = await api.post<ApiResponse<TokenRefreshResponse>>('/auth/refresh', {
        refreshToken: refreshTokenValue
      });
      if (!response.success) {
        throw new ApiError(response.message || 'Token refresh failed',  401);
      }
      // Store new tokens
      if (response.data?.token && response.data?.refreshToken) {
        setTokens(response.data.token, response.data.refreshToken);
      }
      return response.data!;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearTokens(); // Clear invalid tokens
      throw error;
    }
  },

  /**
   * Change password for authenticated user
   * POST /auth/change-password
   */
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/change-password', data);
      if (!response.success) {
        throw new ApiError(response.message || 'Password change failed',  400);
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  /**
   * Setup two-factor authentication
   * POST /auth/setup-2fa
   */
  setupTwoFactor: async (data: SetupTwoFactorData): Promise<{
    secret?: string;
    qrCode?: string;
    backupCodes?: string[];
  }> => {
    try {
      const response = await api.post<ApiResponse<{
        secret?: string;
        qrCode?: string;
        backupCodes?: string[];
      }>>('/auth/setup-2fa', data);
      if (!response.success) {
        throw new ApiError(response.message || '2FA setup failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('2FA setup error:', error);
      throw error;
    }
  },

  /**
   * Verify two-factor authentication setup
   * POST /auth/verify-2fa
   */
  verifyTwoFactor: async (data: VerifyTwoFactorData): Promise<{ verified: boolean }> => {
    try {
      const response = await api.post<ApiResponse<{ verified: boolean }>>('/auth/verify-2fa', data);
      if (!response.success) {
        throw new ApiError(response.message || '2FA verification failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    }
  },

  /**
   * Disable two-factor authentication
   * POST /auth/disable-2fa
   */
  disableTwoFactor: async (password: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/disable-2fa', { password });
      if (!response.success) {
        throw new ApiError(response.message || 'Disable 2FA failed',  400);
      }
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  },

  /**
   * Get account security settings
   * GET /auth/security
   */
  getSecuritySettings: async (): Promise<SecuritySettings> => {
    try {
      const response = await api.get<ApiResponse<SecuritySettings>>('/auth/security');
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch security settings',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Get security settings error:', error);
      throw error;
    }
  },

  /**
   * Update account security settings
   * PUT /auth/security
   */
  updateSecuritySettings: async (settings: Partial<SecuritySettings>): Promise<SecuritySettings> => {
    try {
      const response = await api.put<ApiResponse<SecuritySettings>>('/auth/security', settings);
      if (!response.success) {
        throw new ApiError(response.message || 'Security settings update failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Update security settings error:', error);
      throw error;
    }
  },

  /**
   * Check email availability
   * POST /auth/check-email-availability
   */
  checkEmailAvailability: async (email: string): Promise<{ available: boolean }> => {
    try {
      const response = await api.post<ApiResponse<{ available: boolean }>>('/auth/check-email-availability', { email });
      if (!response.success) {
        throw new ApiError(response.message || 'Email check failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Email availability check error:', error);
      throw error;
    }
  },

  /**
   * Validate token
   * POST /auth/validate-token
   */
  validateToken: async (token: string): Promise<{ valid: boolean; user?: AnyUser }> => {
    try {
      const response = await api.post<ApiResponse<{ valid: boolean; user?: AnyUser }>>('/auth/validate-token', { token });
      if (!response.success) {
        throw new ApiError(response.message || 'Token validation failed',  400);
      }
      return response.data!;
    } catch (error) {
      console.error('Token validation error:', error);
      throw error;
    }
  },

  /**
   * Get current authenticated user profile (alias for getProfile)
   * GET /auth/me
   */
  getCurrentUser: async (): Promise<AnyUser> => {
    return authApi.getProfile();
  },
};

// Export as default for convenience
export default authApi;

