// src/lib/auth/auth-service.ts
import { apiClient } from '@/lib/api/client';
import { LoginCredentials, SignupData, AuthResponse, User } from '@/types/auth';

export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe || false,
    });
    return response.data;
  },

  /**
   * Register new user account
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      businessWebsite: data.businessWebsite,
      businessNumber: data.businessNumber,
      country: data.country,
      occupation: data.occupation,
    });
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on the server, we should clear local storage
      console.error('Logout error:', error);
    }
  },

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Send password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', {
      email,
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      password: newPassword,
    });
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', {
      token,
    });
  },

  /**
   * Resend email verification
   */
  async resendVerification(): Promise<void> {
    await apiClient.post('/auth/resend-verification');
  },
};
