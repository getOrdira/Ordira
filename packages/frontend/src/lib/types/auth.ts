// src/lib/types/auth.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { AnyUser } from './user';

/**
 * Login credentials interface
 * Based on backend loginUserSchema
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string; // Optional 6-character alphanumeric for 2FA
  deviceFingerprint?: string;
}

/**
 * Business login credentials (alternative login method)
 * Based on backend loginBusinessSchema (assuming similar to loginUserSchema with emailOrPhone)
 */
export interface BusinessLoginCredentials {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  deviceFingerprint?: string;
}

/**
 * User (customer) registration data
 * Based on backend registerUserSchema - aligned with required fields and constraints
 */
export interface RegisterUserData {
  firstName: string; // Required, min 2, max 50
  lastName: string; // Required, min 2, max 50
  email: string; // Required, valid email, no disposable
  password: string; // Required, min 8, max 128, pattern enforced
  phone?: string; // Optional, international format
  dateOfBirth?: string | Date; // Optional, min 1900-01-01, max now
  acceptTerms: boolean; // Required, must be true
  marketingConsent?: boolean; // Optional, default false
  businessId?: string; // For voting access to specific business
  deviceFingerprint?: string;
}

/**
 * Business registration data
 * Based on backend registerBusinessSchema (inferred from app context)
 */
export interface RegisterBusinessData {
  businessName: string;
  businessEmail: string;
  password: string;
  businessAddress?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessNumber?: string; // Registration/tax number
  country?: string;
  industry?: string;
  planType?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  contactName?: string;
  contactPhone?: string;
  acceptTerms: boolean; // Added for alignment with general register
  marketingConsent?: boolean; // Added for alignment
  deviceFingerprint?: string;
}

/**
 * Manufacturer registration data
 * Based on backend manufacturerRegistrationSchema (inferred)
 */
export interface RegisterManufacturerData {
  name: string; // Company name
  email: string;
  password: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  website?: string;
  country?: string;
  city?: string;
  establishedYear?: number;
  employeeCount?: number;
  servicesOffered?: string[];
  acceptTerms: boolean; // Added for alignment
  marketingConsent?: boolean; // Added for alignment
  deviceFingerprint?: string;
}

/**
 * Generic registration data union type
 */
export type RegisterData = RegisterUserData | RegisterBusinessData | RegisterManufacturerData;

/**
 * Email verification data
 * Based on backend verifyUserSchema
 */
export interface EmailVerificationData {
  email?: string;
  businessId?: string;
  emailCode: string; // 6-character alphanumeric code
  phoneCode?: string; // Optional phone verification
  deviceFingerprint?: string;
}

/**
 * Password reset request data
 * Based on backend forgotPasswordSchema
 */
export interface ForgotPasswordData {
  email: string;
  businessName?: string; // For business account recovery
  phone?: string;
}

/**
 * Password reset confirmation data
 * Based on backend resetPasswordSchema
 */
export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password change data for authenticated users
 * Based on backend changePasswordSchema
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Two-factor authentication authentication setup data
 * Based on backend setupTwoFactorSchema (inferred from accountSettingsSchema security)
 */
export interface SetupTwoFactorData {
  method: 'sms' | 'email' | 'app';
  phoneNumber?: string; // Required if method is 'sms'
}

/**
 * Two-factor authentication verification data
 * Based on backend verifyTwoFactorSchema
 */
export interface VerifyTwoFactorData {
  code?: string; // 6-character alphanumeric
  backupCode?: string; // 8-character alphanumeric backup code
}

/**
 * Account recovery data
 * Based on backend accountRecoverySchema (inferred)
 */
export interface AccountRecoveryData {
  email: string;
  businessName?: string; // For business account recovery
  phone?: string;
}

/**
 * Authentication response structure
 * Common response from login/register/refresh endpoints
 */
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AnyUser;
  token?: string;
  refreshToken?: string;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  token: string;
  refreshToken?: string;
  user?: AnyUser;
}

/**
 * Session information
 */
export interface SessionInfo {
  sessionId: string;
  device: string;
  ipAddress: string;
  location?: string;
  createdAt: string;
  lastActivity: string;
  isCurrent: boolean;
}

/**
 * Auth state for stores/context
 */
export interface AuthState {
  user: AnyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshToken: string | null;
  sessionInfo?: SessionInfo;
}

/**
 * Login attempt tracking
 */
export interface LoginAttempt {
  email: string;
  timestamp: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
}

/**
 * Account security settings
 * Aligned with accountSettingsSchema security section
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'sms' | 'email' | 'app';
  loginNotifications: boolean;
  securityAlerts: boolean;
  sessionTimeout: number; // In minutes, min 15, max 10080
  passwordLastChanged: string;
  lastLoginAt: string;
  loginAttempts: LoginAttempt[];
  activeSessionsCount: number;
  accountLockStatus: {
    isLocked: boolean;
    lockUntil?: string;
    reason?: string;
  };
}

/**
 * Registration validation errors
 */
export interface RegistrationValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Registration result with validation
 */
export interface RegistrationResult {
  success: boolean;
  message?: string;
  user?: AnyUser;
  token?: string;
  errors?: RegistrationValidationError[];
  registrationInfo?: {
    accountType: 'business' | 'user' | 'manufacturer';
    verificationRequired: boolean;
    registeredAt: string;
  };
  nextSteps?: {
    immediate: string[];
    onboarding?: string[];
  };
}

/**
 * Device fingerprint data for security
 */
export interface DeviceFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  timestamp: string;
}

/**
 * Auth API endpoints configuration
 */
export interface AuthEndpoints {
  // User authentication
  registerUser: '/auth/register/user';
  loginUser: '/auth/login/user';
  verifyUser: '/auth/verify/user';
  
  // Business authentication
  registerBusiness: '/auth/register/business';
  loginBusiness: '/auth/login/business';
  verifyBusiness: '/auth/verify/business';
  
  // Manufacturer authentication
  registerManufacturer: '/manufacturer/auth/register';
  loginManufacturer: '/manufacturer/auth/login';
  verifyManufacturer: '/manufacturer/auth/verify-email';
  
  // Common endpoints
  logout: '/auth/logout';
  refreshToken: '/auth/refresh';
  forgotPassword: '/auth/forgot-password';
  resetPassword: '/auth/reset-password';
  changePassword: '/auth/change-password';
  me: '/auth/me';
  
  // Session management
  sessions: '/auth/sessions';
  revokeSession: '/auth/sessions/:sessionId';
  revokeAllSessions: '/auth/sessions/revoke-all';
  
  // Verification
  resendVerification: '/auth/resend-verification';
  
  // Two-factor authentication
  setupTwoFactor: '/auth/setup-2fa';
  verifyTwoFactor: '/auth/verify-2fa';
  disableTwoFactor: '/auth/disable-2fa';
}

/**
 * Query parameters for listing users
 * Based on backend listUsersQuerySchema
 */
export interface ListUsersQuery {
  page?: number; // Default 1, min 1
  limit?: number; // Default 20, min 1, max 100
  searchTerm?: string; // Min 3 characters
  role?: 'brand' | 'manufacturer' | 'customer'; // App-specific roles
  status?: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  startDate?: Date | string;
  endDate?: Date | string;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt' | 'lastLoginAt' | 'status'; // Default 'createdAt'
  sortOrder?: 'asc' | 'desc'; // Default 'desc'
  includeDeleted?: boolean; // Default false
}

/**
 * Type guards for auth interfaces
 */
export function isBusinessLoginCredentials(credentials: any): credentials is BusinessLoginCredentials {
  return credentials && 'emailOrPhone' in credentials;
}

export function isRegisterBusinessData(data: any): data is RegisterBusinessData {
  return data && 'businessName' in data && 'businessEmail' in data;
}

export function isRegisterManufacturerData(data: any): data is RegisterManufacturerData {
  return data && 'name' in data && !('businessName' in data);
}

export function isRegisterUserData(data: any): data is RegisterUserData {
  return data && !('businessName' in data) && !('name' in data);
}

// ===== JOI VALIDATION SCHEMAS =====
// Aligned with backend auth validation schemas

/**
 * Login credentials validation schema
 * Based on backend loginUserSchema
 */
export const loginCredentialsSchema = Joi.object<LoginCredentials>({
  email: commonSchemas.email,
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().default(false),
  twoFactorCode: commonSchemas.twoFactorCode,
  deviceFingerprint: Joi.string().optional()
});

/**
 * Business login credentials validation schema
 * Based on backend loginBusinessSchema with emailOrPhone alternative
 */
export const businessLoginCredentialsSchema = Joi.object<BusinessLoginCredentials>({
  emailOrPhone: Joi.alternatives()
    .try(commonSchemas.email, commonSchemas.phone)
    .required()
    .messages({
      'any.required': 'Email or phone number is required'
    }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().default(false),
  twoFactorCode: commonSchemas.twoFactorCode,
  deviceFingerprint: Joi.string().optional()
});

/**
 * User registration validation schema
 * Based on backend registerUserSchema with all constraints
 */
export const registerUserSchema = Joi.object<RegisterUserData>({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Last name is required'
    }),
  
  email: commonSchemas.businessEmail, // Use business email validation (blocks disposable)
  password: commonSchemas.password,
  phone: commonSchemas.optionalPhone,
  dateOfBirth: commonSchemas.dateOfBirth,
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
  marketingConsent: Joi.boolean().default(false),
  businessId: commonSchemas.mongoId.optional(),
  deviceFingerprint: Joi.string().optional()
});

/**
 * Business registration validation schema
 * Based on backend registerBusinessSchema
 */
export const registerBusinessSchema = Joi.object<RegisterBusinessData>({
  businessName: commonSchemas.businessName,
  businessEmail: commonSchemas.businessEmail,
  password: commonSchemas.password,
  businessAddress: commonSchemas.mediumText.optional(),
  businessPhone: commonSchemas.optionalPhone,
  businessWebsite: commonSchemas.optionalUrl,
  businessNumber: Joi.string()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Business registration number cannot exceed 50 characters'
    }),
  country: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Country name cannot exceed 100 characters'
    }),
  industry: commonSchemas.industry,
  planType: commonSchemas.optionalPlan,
  contactName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Contact name must be at least 2 characters',
      'string.max': 'Contact name cannot exceed 100 characters'
    }),
  contactPhone: commonSchemas.optionalPhone,
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
  marketingConsent: Joi.boolean().default(false),
  deviceFingerprint: Joi.string().optional()
});

/**
 * Manufacturer registration validation schema
 * Based on backend registerManufacturerSchema
 */
export const registerManufacturerSchema = Joi.object<RegisterManufacturerData>({
  name: commonSchemas.businessName.messages({
    'any.required': 'Company name is required'
  }),
  email: commonSchemas.businessEmail,
  password: commonSchemas.password,
  industry: commonSchemas.industry,
  description: commonSchemas.optionalLongText,
  contactEmail: commonSchemas.optionalEmail,
  website: commonSchemas.optionalUrl,
  country: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Country name cannot exceed 100 characters'
    }),
  city: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'City name cannot exceed 100 characters'
    }),
  establishedYear: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear())
    .optional()
    .messages({
      'number.min': 'Established year must be after 1800',
      'number.max': 'Established year cannot be in the future'
    }),
  employeeCount: Joi.number()
    .integer()
    .min(1)
    .max(1000000)
    .optional()
    .messages({
      'number.min': 'Employee count must be at least 1',
      'number.max': 'Employee count seems unrealistic'
    }),
  servicesOffered: commonSchemas.servicesOffered,
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
  marketingConsent: Joi.boolean().default(false),
  deviceFingerprint: Joi.string().optional()
});

/**
 * Email verification validation schema
 * Based on backend verifyUserSchema
 */
export const emailVerificationSchema = Joi.object<EmailVerificationData>({
  email: commonSchemas.optionalEmail,
  businessId: commonSchemas.mongoId.optional(),
  emailCode: commonSchemas.verificationCode,
  phoneCode: commonSchemas.verificationCode.optional(),
  deviceFingerprint: Joi.string().optional()
});

/**
 * Forgot password validation schema
 * Based on backend forgotPasswordSchema
 */
export const forgotPasswordSchema = Joi.object<ForgotPasswordData>({
  email: commonSchemas.email,
  businessName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name cannot exceed 100 characters'
    }),
  phone: commonSchemas.optionalPhone
});

/**
 * Reset password validation schema
 * Based on backend resetPasswordSchema
 */
export const resetPasswordSchema = Joi.object<ResetPasswordData>({
  token: Joi.string()
    .alphanum()
    .min(32)
    .max(128)
    .required()
    .messages({
      'string.alphanum': 'Reset token must be alphanumeric',
      'string.min': 'Reset token is invalid',
      'string.max': 'Reset token is invalid',
      'any.required': 'Reset token is required'
    }),
  newPassword: commonSchemas.password,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Change password validation schema
 * Based on backend changePasswordSchema
 */
export const changePasswordSchema = Joi.object<ChangePasswordData>({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: commonSchemas.password,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Setup two-factor authentication validation schema
 * Based on backend setupTwoFactorSchema
 */
export const setupTwoFactorSchema = Joi.object<SetupTwoFactorData>({
  method: Joi.string()
    .valid('sms', 'email', 'app')
    .required()
    .messages({
      'any.only': 'Two-factor method must be sms, email, or app',
      'any.required': 'Two-factor method is required'
    }),
  phoneNumber: commonSchemas.phone
    .when('method', {
      is: 'sms',
      then: Joi.required().messages({
        'any.required': 'Phone number is required for SMS two-factor authentication'
      }),
      otherwise: Joi.optional()
    })
});

/**
 * Verify two-factor authentication validation schema
 * Based on backend verifyTwoFactorSchema
 */
export const verifyTwoFactorSchema = Joi.object<VerifyTwoFactorData>({
  code: Joi.string()
    .alphanum()
    .length(6)
    .optional()
    .messages({
      'string.alphanum': 'Two-factor code must be alphanumeric',
      'string.length': 'Two-factor code must be exactly 6 characters'
    }),
  backupCode: Joi.string()
    .alphanum()
    .length(8)
    .optional()
    .messages({
      'string.alphanum': 'Backup code must be alphanumeric',
      'string.length': 'Backup code must be exactly 8 characters'
    })
}).xor('code', 'backupCode').messages({
  'object.xor': 'Either two-factor code or backup code is required, but not both'
});

/**
 * Account recovery validation schema
 * Based on backend accountRecoverySchema
 */
export const accountRecoverySchema = Joi.object<AccountRecoveryData>({
  email: commonSchemas.email,
  businessName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name cannot exceed 100 characters'
    }),
  phone: commonSchemas.optionalPhone
});

/**
 * List users query validation schema
 * Based on backend listUsersQuerySchema
 */
export const listUsersQuerySchema = Joi.object<ListUsersQuery>({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  searchTerm: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 3 characters',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  role: Joi.string()
    .valid('brand', 'manufacturer', 'customer')
    .optional()
    .messages({
      'any.only': 'Role must be brand, manufacturer, or customer'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'suspended', 'deleted')
    .optional()
    .messages({
      'any.only': 'Status must be active, inactive, pending, suspended, or deleted'
    }),
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  sortBy: Joi.string()
    .valid('firstName', 'lastName', 'email', 'createdAt', 'lastLoginAt', 'status')
    .default('createdAt')
    .optional(),
  sortOrder: commonSchemas.sortOrder,
  includeDeleted: Joi.boolean().default(false)
});

/**
 * Export all auth validation schemas for easy importing
 */
export const authValidationSchemas = {
  loginCredentials: loginCredentialsSchema,
  businessLoginCredentials: businessLoginCredentialsSchema,
  registerUser: registerUserSchema,
  registerBusiness: registerBusinessSchema,
  registerManufacturer: registerManufacturerSchema,
  emailVerification: emailVerificationSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  setupTwoFactor: setupTwoFactorSchema,
  verifyTwoFactor: verifyTwoFactorSchema,
  accountRecovery: accountRecoverySchema,
  listUsersQuery: listUsersQuerySchema
};
