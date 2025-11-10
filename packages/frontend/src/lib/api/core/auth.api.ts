// src/lib/api/core/auth.api.ts
// Authentication API module aligned with backend routes/core/auth.routes.ts

import Joi from 'joi';

import { api } from '../client';
import baseApi from './base.api';
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
  AuthResponse,
  TokenRefreshResponse,
  SecuritySettings
} from '@/lib/types/features/auth';
import type { ApiResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors/errors';
import type { AnyUser } from '@/lib/types/features/users';
import { setTokens, getRefreshToken, clearTokens } from '@/lib/auth/session/session';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { commonSchemas } from '@/lib/validation/schemas/commonSchemas';
import { securityFeatureSchemas } from '@/lib/validation/schemas/features/security';

type HandleResponseOptions = Parameters<typeof baseApi.handleResponse>[3];

const VOID_RESPONSE_OPTIONS: HandleResponseOptions = { requireData: false };
const CURRENT_YEAR = new Date().getFullYear();

type TokenRefreshPayload = {
  refreshToken: string;
};

const emailOrPhoneSchema = Joi.alternatives()
  .try(
    Joi.string().email({ tlds: { allow: false } }).lowercase(),
    Joi.string()
      .trim()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.pattern.base': 'Phone number must be a valid E.164 formatted value'
      })
  )
  .messages({
    'alternatives.match': 'Provide a valid email address or phone number'
  });

const loginSchema = Joi.object<LoginCredentials>({
  email: commonSchemas.email,
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().optional(),
  twoFactorCode: commonSchemas.twoFactorCode,
  deviceFingerprint: Joi.string().trim().max(200).optional()
});

const loginBusinessSchema = Joi.object<BusinessLoginCredentials>({
  emailOrPhone: emailOrPhoneSchema.required(),
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().optional(),
  twoFactorCode: commonSchemas.twoFactorCode,
  deviceFingerprint: Joi.string().trim().max(200).optional()
});

const registerUserSchema = Joi.object<RegisterUserData>({
  email: commonSchemas.email,
  password: commonSchemas.password,
  firstName: Joi.string().trim().min(2).max(100).required(),
  lastName: Joi.string().trim().min(2).max(100).required(),
  businessId: commonSchemas.optionalMongoId,
  brandSlug: Joi.string().trim().max(100).optional(),
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional()
  }).optional(),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'Terms of service must be accepted'
  }),
  marketingConsent: Joi.boolean().optional(),
  deviceFingerprint: Joi.string().trim().max(200).optional()
});

const registerBusinessSchema = Joi.object<RegisterBusinessData>({
  firstName: Joi.string().trim().min(2).max(100).required(),
  lastName: Joi.string().trim().min(2).max(100).required(),
  dateOfBirth: Joi.alternatives()
    .try(Joi.date().iso(), Joi.string().isoDate())
    .required()
    .messages({
      'date.base': 'Date of birth must be a valid date',
      'string.isoDate': 'Date of birth must be a valid ISO date string'
    }),
  email: commonSchemas.email,
  phone: commonSchemas.phone,
  businessName: Joi.string().trim().min(2).max(150).required(),
  businessType: Joi.string().valid('brand', 'creator').required(),
  regNumber: Joi.string().trim().max(100).optional(),
  taxId: Joi.string().trim().max(100).optional(),
  address: Joi.string().trim().min(5).max(300).required(),
  password: commonSchemas.password,
  businessWebsite: commonSchemas.optionalUrl,
  industry: commonSchemas.industry,
  planType: commonSchemas.optionalPlan,
  contactName: Joi.string().trim().max(150).optional(),
  contactPhone: commonSchemas.optionalPhone,
  acceptTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'Terms of service must be accepted'
  }),
  marketingConsent: Joi.boolean().optional(),
  deviceFingerprint: Joi.string().trim().max(200).optional()
});

const registerManufacturerSchema = Joi.object<RegisterManufacturerData>({
  name: Joi.string().trim().min(2).max(200).required(),
  email: commonSchemas.email,
  password: commonSchemas.password,
  description: Joi.string().trim().max(1000).optional(),
  industry: commonSchemas.industry,
  servicesOffered: commonSchemas.servicesOffered,
  minimumOrderQuantity: Joi.number().integer().min(1).optional(),
  contactEmail: commonSchemas.optionalEmail,
  phone: commonSchemas.optionalPhone,
  website: commonSchemas.optionalUrl,
  location: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    address: Joi.string().trim().max(200).optional(),
    timezone: Joi.string().trim().max(100).optional()
  }).optional(),
  acceptTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'Terms of service must be accepted'
  }),
  marketingConsent: Joi.boolean().optional(),
  deviceFingerprint: Joi.string().trim().max(200).optional(),
  establishedYear: Joi.number().integer().min(1900).max(CURRENT_YEAR).optional(),
  employeeCount: Joi.number().integer().min(1).max(1_000_000).optional()
});

const userVerificationSchema = Joi.object<EmailVerificationData>({
  email: commonSchemas.email,
  code: commonSchemas.verificationCode,
  businessId: commonSchemas.optionalMongoId
});

const businessVerificationSchema = Joi.object<EmailVerificationData>({
  email: commonSchemas.email,
  businessId: commonSchemas.mongoId,
  emailCode: commonSchemas.verificationCode,
  phoneCode: Joi.string().alphanum().min(4).max(12).optional()
});

const manufacturerVerificationSchema = Joi.object<EmailVerificationData>({
  email: commonSchemas.email,
  verificationCode: commonSchemas.verificationCode
});

const resendVerificationSchema = Joi.object<EmailVerificationData>({
  email: commonSchemas.email
});

const forgotPasswordSchema = Joi.object<ForgotPasswordData>({
  email: commonSchemas.email
});

const resetPasswordSchema = Joi.object<ResetPasswordData>({
  token: Joi.string().alphanum().min(32).max(256).required(),
  newPassword: commonSchemas.password,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).optional().messages({
    'any.only': 'Confirm password must match the new password'
  })
});

const changePasswordSchema = Joi.object<ChangePasswordData>({
  currentPassword: Joi.string().min(8).max(128).required(),
  newPassword: commonSchemas.password.invalid(Joi.ref('currentPassword')).messages({
    'any.invalid': 'New password must be different from the current password'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).optional().messages({
    'any.only': 'Confirm password must match the new password'
  })
});

const setupTwoFactorSchema = Joi.object<SetupTwoFactorData>({
  password: Joi.string().min(8).max(128).required(),
  method: Joi.string().valid('totp', 'sms', 'email').default('totp').optional()
});

const verifyTwoFactorSchema = Joi.object<VerifyTwoFactorData>({
  code: Joi.string().alphanum().length(6).required(),
  backupCode: Joi.string().alphanum().length(8).optional()
});

const disableTwoFactorSchema = Joi.object<{ password: string }>({
  password: Joi.string().min(8).max(128).required()
});

const refreshTokenSchema = Joi.object<{ refreshToken: string }>({
  refreshToken: Joi.string().trim().min(10).required()
});

const emailAvailabilitySchema = Joi.object<{ email: string }>({
  email: commonSchemas.email
});

const tokenValidationSchema = Joi.object<{ token: string }>({
  token: securityFeatureSchemas.token
});

const updateSecuritySettingsSchema = Joi.object<Partial<SecuritySettings>>({
  twoFactorEnabled: Joi.boolean().optional(),
  twoFactorMethod: Joi.string().valid('totp', 'sms', 'email').optional(),
  backupCodes: Joi.array().items(Joi.string().trim().min(6).max(32)).max(10).optional(),
  activeSessions: Joi.number().integer().min(0).optional(),
  lastPasswordChange: Joi.date().optional(),
  loginNotifications: Joi.boolean().optional(),
  suspiciousActivityAlerts: Joi.boolean().optional()
}).min(1);

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createLogContext = (method: HttpMethod, endpoint: string) => ({
  method,
  endpoint
});

const persistSession = (auth?: AuthResponse | null): void => {
  if (auth?.token && auth.refreshToken) {
    setTokens(auth.token, auth.refreshToken);
  }
};

const isBusinessRegistrationData = (
  data: RegisterUserData | RegisterBusinessData
): data is RegisterBusinessData => {
  return 'businessName' in data || 'businessType' in data;
};

const postValidated = async <TPayload, TResponse>(
  endpoint: string,
  schema: Joi.ObjectSchema<TPayload>,
  payload: unknown,
  errorMessage: string,
  defaultStatusCode?: number,
  options?: HandleResponseOptions
): Promise<TResponse> => {
  const sanitized = baseApi.validateAndSanitize(schema, payload);
  const response = await api.post<ApiResponse<TResponse>>(endpoint, sanitized);
  return baseApi.handleResponse(response, errorMessage, defaultStatusCode, options);
};

const putValidated = async <TPayload, TResponse>(
  endpoint: string,
  schema: Joi.ObjectSchema<TPayload>,
  payload: unknown,
  errorMessage: string,
  defaultStatusCode?: number,
  options?: HandleResponseOptions
): Promise<TResponse> => {
  const sanitized = baseApi.validateAndSanitize(schema, payload);
  const response = await api.put<ApiResponse<TResponse>>(endpoint, sanitized);
  return baseApi.handleResponse(response, errorMessage, defaultStatusCode, options);
};

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
      const auth = await postValidated<LoginCredentials, AuthResponse>(
        '/auth/login',
        loginSchema,
        credentials,
        'Login failed',
        401
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/login'));
    }
  },

  /**
   * Register user
   * POST /auth/register
   */
  register: async (data: RegisterUserData | RegisterBusinessData): Promise<AuthResponse> => {
    if (isBusinessRegistrationData(data)) {
      return authApi.registerBusiness(data);
    }
    return authApi.registerUser(data);
  },

  /**
   * Verify email
   * POST /auth/verify
   */
  verify: async (data: EmailVerificationData): Promise<void> => {
    try {
      await postValidated('/auth/verify', userVerificationSchema, data, 'Verification failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/verify'));
    }
  },

  /**
   * Forgot password
   * POST /auth/forgot-password
   */
  forgotPassword: async (data: ForgotPasswordData): Promise<void> => {
    try {
      await postValidated('/auth/forgot-password', forgotPasswordSchema, data, 'Forgot password request failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/forgot-password'));
    }
  },

  /**
   * Reset password
   * POST /auth/reset-password
   */
  resetPassword: async (data: ResetPasswordData): Promise<void> => {
    try {
      await postValidated('/auth/reset-password', resetPasswordSchema, data, 'Password reset failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/reset-password'));
    }
  },

  /**
   * Resend verification email
   * POST /auth/resend-verification
   */
  resendVerification: async (data: EmailVerificationData): Promise<void> => {
    try {
      await postValidated('/auth/resend-verification', resendVerificationSchema, data, 'Resend verification failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/resend-verification'));
    }
  },

  /**
   * Logout
   * POST /auth/logout
   */
  logout: async (): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>('/auth/logout');
      baseApi.handleResponse(response, 'Logout failed', 400, VOID_RESPONSE_OPTIONS);
      clearTokens();
    } catch (error: unknown) {
      handleApiError(error, createLogContext('POST', '/auth/logout'));
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
      return baseApi.handleResponse(response, 'Failed to fetch user', 401);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('GET', '/auth/me'));
    }
  },

  // ===== EXTENDED AUTHENTICATION (Additional endpoints) =====

  /**
   * Register a new customer/user account
   * POST /auth/register/user
   */
  registerUser: async (data: RegisterUserData): Promise<AuthResponse> => {
    try {
      const auth = await postValidated<RegisterUserData, AuthResponse>(
        '/auth/register/user',
        registerUserSchema,
        data,
        'Registration failed',
        400
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/register/user'));
    }
  },

  /**
   * Login customer/user
   * POST /auth/login/user
   */
  loginUser: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const auth = await postValidated<LoginCredentials, AuthResponse>(
        '/auth/login/user',
        loginSchema,
        credentials,
        'Login failed',
        401
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/login/user'));
    }
  },

  /**
   * Verify user email address
   * POST /auth/verify/user
   */
  verifyUser: async (data: EmailVerificationData): Promise<void> => {
    try {
      await postValidated('/auth/verify/user', userVerificationSchema, data, 'Verification failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/verify/user'));
    }
  },

  /**
   * Register a new business/brand account
   * POST /auth/register/business
   */
  registerBusiness: async (data: RegisterBusinessData): Promise<AuthResponse> => {
    try {
      const auth = await postValidated<RegisterBusinessData, AuthResponse>(
        '/auth/register/business',
        registerBusinessSchema,
        data,
        'Registration failed',
        400
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/register/business'));
    }
  },

  /**
   * Login business account (supports email or phone)
   * POST /auth/login/business
   */
  loginBusiness: async (credentials: BusinessLoginCredentials): Promise<AuthResponse> => {
    try {
      const auth = await postValidated<BusinessLoginCredentials, AuthResponse>(
        '/auth/login/business',
        loginBusinessSchema,
        credentials,
        'Login failed',
        401
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/login/business'));
    }
  },

  /**
   * Verify business email address
   * POST /auth/verify/business
   */
  verifyBusiness: async (data: EmailVerificationData): Promise<void> => {
    try {
      await postValidated('/auth/verify/business', businessVerificationSchema, data, 'Verification failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/verify/business'));
    }
  },

  /**
   * Register a new manufacturer account
   * POST /manufacturer/auth/register
   */
  registerManufacturer: async (data: RegisterManufacturerData): Promise<AuthResponse> => {
    try {
      const auth = await postValidated<RegisterManufacturerData, AuthResponse>(
        '/manufacturer/auth/register',
        registerManufacturerSchema,
        data,
        'Registration failed',
        400
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/manufacturer/auth/register'));
    }
  },

  /**
   * Login manufacturer account
   * POST /manufacturer/auth/login
   */
  loginManufacturer: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const auth = await postValidated<LoginCredentials, AuthResponse>(
        '/manufacturer/auth/login',
        loginSchema,
        credentials,
        'Login failed',
        401
      );
      persistSession(auth);
      return auth;
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/manufacturer/auth/login'));
    }
  },

  /**
   * Verify manufacturer email address
   * POST /manufacturer/auth/verify-email
   */
  verifyManufacturer: async (data: EmailVerificationData): Promise<void> => {
    try {
      await postValidated('/manufacturer/auth/verify-email', manufacturerVerificationSchema, data, 'Verification failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/manufacturer/auth/verify-email'));
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
      const payload = { refreshToken: refreshTokenValue };
      const refreshed = await postValidated<TokenRefreshPayload, TokenRefreshResponse>(
        '/auth/refresh',
        refreshTokenSchema,
        payload,
        'Token refresh failed',
        401
      );
      setTokens(refreshed.token, refreshed.refreshToken);
      return refreshed;
    } catch (error: unknown) {
      clearTokens(); // Clear invalid tokens
      throw handleApiError(error, createLogContext('POST', '/auth/refresh'));
    }
  },

  /**
   * Change password for authenticated user
   * POST /auth/change-password
   */
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    try {
      await postValidated('/auth/change-password', changePasswordSchema, data, 'Password change failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/change-password'));
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
      return await postValidated('/auth/setup-2fa', setupTwoFactorSchema, data, '2FA setup failed', 400);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/setup-2fa'));
    }
  },

  /**
   * Verify two-factor authentication setup
   * POST /auth/verify-2fa
   */
  verifyTwoFactor: async (data: VerifyTwoFactorData): Promise<{ verified: boolean }> => {
    try {
      return await postValidated('/auth/verify-2fa', verifyTwoFactorSchema, data, '2FA verification failed', 400);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/verify-2fa'));
    }
  },

  /**
   * Disable two-factor authentication
   * POST /auth/disable-2fa
   */
  disableTwoFactor: async (password: string): Promise<void> => {
    try {
      await postValidated('/auth/disable-2fa', disableTwoFactorSchema, { password }, 'Disable 2FA failed', 400, VOID_RESPONSE_OPTIONS);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/disable-2fa'));
    }
  },

  /**
   * Get account security settings
   * GET /auth/security
   */
  getSecuritySettings: async (): Promise<SecuritySettings> => {
    try {
      const response = await api.get<ApiResponse<SecuritySettings>>('/auth/security');
      return baseApi.handleResponse(response, 'Failed to fetch security settings', 400);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('GET', '/auth/security'));
    }
  },

  /**
   * Update account security settings
   * PUT /auth/security
   */
  updateSecuritySettings: async (settings: Partial<SecuritySettings>): Promise<SecuritySettings> => {
    try {
      return await putValidated('/auth/security', updateSecuritySettingsSchema, settings, 'Security settings update failed', 400);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('PUT', '/auth/security'));
    }
  },

  /**
   * Check email availability
   * POST /auth/check-email-availability
   */
  checkEmailAvailability: async (email: string): Promise<{ available: boolean }> => {
    try {
      return await postValidated('/auth/check-email-availability', emailAvailabilitySchema, { email }, 'Email check failed', 400);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/check-email-availability'));
    }
  },

  /**
   * Validate token
   * POST /auth/validate-token
   */
  validateToken: async (token: string): Promise<{ valid: boolean; user?: AnyUser }> => {
    try {
      return await postValidated('/auth/validate-token', tokenValidationSchema, { token }, 'Token validation failed', 400);
    } catch (error: unknown) {
      throw handleApiError(error, createLogContext('POST', '/auth/validate-token'));
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

