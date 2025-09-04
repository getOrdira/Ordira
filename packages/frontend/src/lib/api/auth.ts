// src/lib/api/auth.ts
import { api } from './client'; // Updated to use the exported api object for typed methods
import {
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
  ResendVerificationData,
  AuthResponse,
  EnhancedAuthResponse,
  VerificationResult,
  TokenRefreshResponse,
  ActiveSessionsResponse,
  SecuritySettings,
  ApiError,
  ApiResponse
} from '@/lib/types/auth';
import { AnyUser } from '@/lib/types/user';
import { setTokens, getRefreshToken, clearTokens } from '@/lib/auth/session';

/**
 * Authentication API service
 * Contains all authentication-related API calls aligned with backend endpoints
 */
export const authApi = {
  
  // ===== USER AUTHENTICATION =====
  
  /**
   * Register a new customer/user account
   * POST /auth/register/user
   */
  registerUser: async (data: RegisterUserData): Promise<EnhancedAuthResponse> => {
    try {
      const response = await api.post<ApiResponse<EnhancedAuthResponse>>('/auth/register/user', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Registration failed', statusCode: response.statusCode || 400 });
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
        throw new ApiError({ message: response.message || 'Login failed', statusCode: response.statusCode || 401 });
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
  verifyUser: async (data: EmailVerificationData): Promise<VerificationResult> => {
    try {
      const response = await api.post<ApiResponse<VerificationResult>>('/auth/verify/user', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Verification failed', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('User verification error:', error);
      throw error;
    }
  },

  checkEmailAvailability: async (email: string): Promise<{ available: boolean }> => {
    try {
      const response = await api.post<ApiResponse<{ available: boolean }>>('/auth/check-email-availability', { email });
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Email check failed', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Email availability check error:', error);
      throw error;
    }
  },

  validateToken: async (token: string): Promise<{ valid: boolean; user?: AnyUser }> => {
    try {
      const response = await api.post<ApiResponse<{ valid: boolean; user?: AnyUser }>>('/auth/validate-token', { token });
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Token validation failed', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Token validation error:', error);
      throw error;
    }
  }

  // ===== BUSINESS AUTHENTICATION =====
  
  /**
   * Register a new business/brand account
   * POST /auth/register/business
   */
  registerBusiness: async (data: RegisterBusinessData): Promise<EnhancedAuthResponse> => {
    try {
      const response = await api.post<ApiResponse<EnhancedAuthResponse>>('/auth/register/business', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Registration failed', statusCode: response.statusCode || 400 });
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
        throw new ApiError({ message: response.message || 'Login failed', statusCode: response.statusCode || 401 });
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
  verifyBusiness: async (data: EmailVerificationData): Promise<VerificationResult> => {
    try {
      const response = await api.post<ApiResponse<VerificationResult>>('/auth/verify/business', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Verification failed', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Business verification error:', error);
      throw error;
    }
  },

  // ===== MANUFACTURER AUTHENTICATION =====
  
  /**
   * Register a new manufacturer account
   * POST /manufacturer/auth/register
   */
  registerManufacturer: async (data: RegisterManufacturerData): Promise<EnhancedAuthResponse> => {
    try {
      const response = await api.post<ApiResponse<EnhancedAuthResponse>>('/manufacturer/auth/register', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Registration failed', statusCode: response.statusCode || 400 });
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
        throw new ApiError({ message: response.message || 'Login failed', statusCode: response.statusCode || 401 });
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
  verifyManufacturer: async (data: EmailVerificationData): Promise<VerificationResult> => {
    try {
      const response = await api.post<ApiResponse<VerificationResult>>('/manufacturer/auth/verify-email', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Verification failed', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Manufacturer verification error:', error);
      throw error;
    }
  },

  // ===== COMMON AUTHENTICATION =====
  
  /**
   * Get current authenticated user profile
   * GET /auth/me
   */
  getCurrentUser: async (): Promise<AnyUser> => {
    try {
      const response = await api.get<ApiResponse<AnyUser>>('/auth/me');
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Failed to fetch user', statusCode: response.statusCode || 401 });
      }
      return response.data!;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  /**
   * Logout current session
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
   * Logout from all sessions
   * POST /auth/logout-all
   */
  logoutAllSessions: async (): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/logout-all');
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Failed to logout all sessions', statusCode: response.statusCode || 400 });
      }
      clearTokens();
    } catch (error) {
      console.error('Logout all sessions error:', error);
      clearTokens();
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
      throw new ApiError({ message: 'No refresh token available', statusCode: 401 });
    }

    try {
      const response = await api.post<ApiResponse<TokenRefreshResponse>>('/auth/refresh', {
        refreshToken: refreshTokenValue
      });
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Token refresh failed', statusCode: response.statusCode || 401 });
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

  // ===== PASSWORD MANAGEMENT =====
  
  /**
   * Send password reset email
   * POST /auth/forgot-password
   */
  forgotPassword: async (data: ForgotPasswordData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/forgot-password', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Forgot password request failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  resetPassword: async (data: ResetPasswordData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/reset-password', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Password reset failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Reset password error:', error);
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
        throw new ApiError({ message: response.message || 'Password change failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // ===== EMAIL VERIFICATION =====
  
  /**
   * Resend email verification code
   * POST /auth/resend-verification
   */
  resendVerification: async (data?: ResendVerificationData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/resend-verification', data || {});
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Resend verification failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  },

  // ===== TWO-FACTOR AUTHENTICATION =====
  
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
        throw new ApiError({ message: response.message || '2FA setup failed', statusCode: response.statusCode || 400 });
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
        throw new ApiError({ message: response.message || '2FA verification failed', statusCode: response.statusCode || 400 });
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
        throw new ApiError({ message: response.message || 'Disable 2FA failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  },

  // ===== SESSION MANAGEMENT =====
  
  /**
   * Get all active sessions
   * GET /auth/sessions
   */
  getActiveSessions: async (): Promise<ActiveSessionsResponse> => {
    try {
      const response = await api.get<ApiResponse<ActiveSessionsResponse>>('/auth/sessions');
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Failed to fetch sessions', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Get active sessions error:', error);
      throw error;
    }
  },

  /**
   * Revoke specific session
   * DELETE /auth/sessions/:sessionId
   */
  revokeSession: async (sessionId: string): Promise<void> => {
    try {
      const response = await api.delete<ApiResponse<void>>(`/auth/sessions/${sessionId}`);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Session revocation failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  },

  /**
   * Revoke all sessions except current
   * POST /auth/sessions/revoke-all
   */
  revokeAllSessions: async (): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/sessions/revoke-all');
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Revoke all sessions failed', statusCode: response.statusCode || 400 });
      }
      clearTokens(); // Clear local tokens as all sessions are revoked
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      clearTokens();
      throw error;
    }
  },

  /**
   * Get session information
   * GET /auth/session-info
   */
  getSessionInfo: async (): Promise<{ sessionId: string; expiresAt: string; lastActivity: string }> => {
    try {
      const response = await api.get<ApiResponse<{ sessionId: string; expiresAt: string; lastActivity: string }>>('/auth/session-info');
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Failed to fetch session info', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Get session info error:', error);
      throw error;
    }
  },

  // ===== ACCOUNT RECOVERY =====
  
  /**
   * Initiate account recovery process
   * POST /auth/account-recovery
   */
  requestAccountRecovery: async (data: AccountRecoveryData): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/account-recovery', data);
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Account recovery request failed', statusCode: response.statusCode || 400 });
      }
    } catch (error) {
      console.error('Account recovery request error:', error);
      throw error;
    }
  },

  // ===== SECURITY & SETTINGS =====
  
  /**
   * Get account security settings
   * GET /auth/security
   */
  getSecuritySettings: async (): Promise<SecuritySettings> => {
    try {
      const response = await api.get<ApiResponse<SecuritySettings>>('/auth/security');
      if (!response.success) {
        throw new ApiError({ message: response.message || 'Failed to fetch security settings', statusCode: response.statusCode || 400 });
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
        throw new ApiError({ message: response.message || 'Security settings update failed', statusCode: response.statusCode || 400 });
      }
      return response.data!;
    } catch (error) {
      console.error('Update security settings error:', error);
      throw error;
    }
  }
};

/**
 * Convenience functions for role-based authentication - FIXED for Creator/Brand parity
 */
export const authHelpers = {
  
    /**
     * Login based on user type detection - FIXED: Creators use business login
     */
    smartLogin: async (credentials: LoginCredentials | BusinessLoginCredentials, userType?: 'Brand' | 'Creator' | 'Manufacturer'): Promise<AuthResponse> => {
      try {
        // If user type is specified, route accordingly
        if (userType) {
          switch (userType) {
            case 'Brand':
            case 'Creator': // ✅ FIXED: Creators use business login
              return await authApi.loginBusiness('emailOrPhone' in credentials ? credentials : {
                emailOrPhone: credentials.email,
                password: credentials.password,
                rememberMe: credentials.rememberMe,
                deviceFingerprint: credentials.deviceFingerprint
              });
            case 'Manufacturer':
              return await authApi.loginManufacturer(credentials as LoginCredentials);
          }
        }
  
        // Auto-detect based on credentials format
        if ('emailOrPhone' in credentials) {
          return await authApi.loginBusiness(credentials);
        }
        
        // Try user login first, then fallback to business, then manufacturer
        try {
          return await authApi.loginUser(credentials as LoginCredentials);
        } catch (userError: any) {
          if (userError?.statusCode === 404) {
            console.log('User not found, attempting business login');
            try {
              return await authApi.loginBusiness({
                emailOrPhone: credentials.email,
                password: credentials.password,
                rememberMe: credentials.rememberMe,
                deviceFingerprint: credentials.deviceFingerprint
              });
            } catch (businessError: any) {
              if (businessError?.statusCode === 404) {
                console.log('Business not found, attempting manufacturer login');
                return await authApi.loginManufacturer(credentials as LoginCredentials);
              }
              throw businessError;
            }
          }
          throw userError;
        }
      } catch (error) {
        console.error('Smart login error:', error);
        throw error;
      }
    },
  
    /**
     * Register based on data type detection - FIXED: Creators use business registration
     */
    smartRegister: async (data: RegisterUserData | RegisterBusinessData | RegisterManufacturerData): Promise<EnhancedAuthResponse> => {
      try {
        if (isRegisterManufacturerData(data)) {
          return await authApi.registerManufacturer(data);
        } else if (isRegisterBusinessData(data)) {
          // ✅ FIXED: Both Brand and Creator use business registration
          return await authApi.registerBusiness(data);
        } else if (isRegisterUserData(data)) {
          return await authApi.registerUser(data);
        } else {
          throw new Error('Invalid registration data type');
        }
      } catch (error) {
        console.error('Smart register error:', error);
        throw error;
      }
    },
  
    /**
     * Verify email based on account type - FIXED: Creators use business verification
     */
    smartVerify: async (data: EmailVerificationData & { accountType?: 'user' | 'business' | 'manufacturer' | 'Brand' | 'Creator' }): Promise<VerificationResult> => {
      try {
        const { accountType, ...verificationData } = data;
        
        switch (accountType) {
          case 'business':
          case 'Brand':
          case 'Creator': // ✅ FIXED: Creators use business verification
            return await authApi.verifyBusiness(verificationData);
          case 'manufacturer':
          case 'manufacturer':
            return await authApi.verifyManufacturer(verificationData);
          case 'user':
          default:
            return await authApi.verifyUser(verificationData);
        }
      } catch (error) {
        console.error('Smart verify error:', error);
        throw error;
      }
    },
  
    /**
     * Get appropriate auth methods for user occupation - NEW
     */
    getAuthMethodsForOccupation: (occupation: 'Brand' | 'Creator' | 'Manufacturer') => {
      switch (occupation) {
        case 'Brand':
        case 'Creator':
          return {
            register: authApi.registerBusiness,
            login: authApi.loginBusiness,
            verify: authApi.verifyBusiness
          };
        case 'Manufacturer':
          return {
            register: authApi.registerManufacturer,
            login: authApi.loginManufacturer,
            verify: authApi.verifyManufacturer
          };
        default:
          return {
            register: authApi.registerUser,
            login: authApi.loginUser,
            verify: authApi.verifyUser
          };
      }
    },
  
    /**
     * Get redirect path after successful login - FIXED: Creators go to same dashboard
     */
    getPostLoginRedirect: (user: AnyUser): string => {
      switch (user.occupation) {
        case 'Brand':
        case 'Creator':
          return '/dashboard';
        case 'Manufacturer':
          return '/manufacturer/dashboard';
        default:
          return '/dashboard';
      }
    },
  
    /**
     * Check if user can access route - FIXED: Creators have same access as Brands
     */
    canAccessRoute: (user: AnyUser | null, route: string): boolean => {
      if (!user) return false;
  
      // Public routes that all authenticated users can access
      const publicRoutes = ['/dashboard', '/profile', '/settings'];
      if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
        return true;
      }
  
      // Brand-like routes (Brand AND Creator access) - FIXED
      const brandRoutes = ['/voting', '/certificates', '/products', '/domains', '/integrations'];
      if (brandRoutes.some(brandRoute => route.startsWith(brandRoute))) {
        return user.occupation === 'Brand' || user.occupation === 'Creator'; // ✅ FIXED
      }
  
      // Manufacturer-only routes
      const manufacturerRoutes = ['/manufacturer', '/orders', '/production'];
      if (manufacturerRoutes.some(mfgRoute => route.startsWith(mfgRoute))) {
        return user.occupation === 'Manufacturer';
      }
  
      // Creator-specific routes (optional)
      const creatorSpecificRoutes = ['/creator', '/content-studio', '/creator-tools'];
      if (creatorSpecificRoutes.some(creatorRoute => route.startsWith(creatorRoute))) {
        return user.occupation === 'Creator';
      }
  
      return true;
    },
  
    /**
     * Generate device fingerprint for security
     */
    generateDeviceFingerprint: (): string => {
      if (typeof window === 'undefined') {
        return ''; // Server-side fallback
      }
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        const fingerprint = {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenResolution: `${screen.width}x${screen.height}`,
          colorDepth: screen.colorDepth,
          canvasFingerprint: canvas.toDataURL(),
          timestamp: Date.now()
        };
        
        return btoa(JSON.stringify(fingerprint));
      } catch (error) {
        console.error('Fingerprint generation error:', error);
        return '';
      }
    }
  };
  
  // Type guards for authentication data - FIXED to handle Creator as Brand
  export const isRegisterBusinessData = (data: any): boolean => {
    return data && (data.businessName || data.businessAddress) && 
           (data.occupation === 'Brand' || data.occupation === 'Creator'); // ✅ FIXED
  };
  
  export const isRegisterManufacturerData = (data: any): boolean => {
    return data && data.industry && data.occupation === 'Manufacturer';
  };
  
  export const isRegisterUserData = (data: any): boolean => {
    return data && data.email && !isRegisterBusinessData(data) && !isRegisterManufacturerData(data);
  };