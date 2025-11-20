/**
 * Authentication Types and Interfaces
 *
 * Centralized type definitions for all authentication-related operations
 * including registration, verification, login, and password reset flows
 * for businesses, users, and manufacturers.
 */

// ===== COMMON TYPES =====

export interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  registrationSource?: string;
  timestamp?: Date;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  marketingEmails?: boolean;
  smsNotifications?: boolean;
  language?: string;
  timezone?: string;
}

export interface Location {
  country?: string;
  city?: string;
  address?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

// ===== BUSINESS AUTHENTICATION TYPES =====

export type RegisterBusinessInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  businessNumber?: string;
  website?: string;
  marketingConsent: boolean;
  platformUpdatesConsent: boolean;
  securityContext?: SecurityContext;
};

export type VerifyBusinessInput = {
  businessId: string;
  emailCode: string;
  phoneCode?: string;
};

export type LoginBusinessInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
  };
};

export interface BusinessAuthResponse {
  token: string;
  businessId: string;
  email: string;
  businessName: string;
  isEmailVerified: boolean;
  plan?: string;
  requiresTwoFactor?: boolean;
  rememberToken?: string;
  user: {
    businessId: string;
    email: string;
    verified: boolean;
  };
  expiresIn: string;
}

// ===== USER AUTHENTICATION TYPES =====

export type RegisterUserInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  businessId?: string;
  brandSlug?: string;
  preferences?: UserPreferences;
  securityContext?: SecurityContext;
};

export type VerifyUserInput = {
  email: string;
  code: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
  businessId?: string;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
  };
  rememberMe?: boolean;
};

export interface UserAuthResponse {
  token: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  preferences: UserPreferences;
  rememberToken?: string;
  emailGating?: any;
}

// ===== MANUFACTURER AUTHENTICATION TYPES =====

export type RegisterManufacturerInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  businessNumber?: string;
  industry: string;
  website?: string;
  marketingConsent: boolean;
  platformUpdatesConsent: boolean;
  securityContext?: SecurityContext;
};

export type VerifyManufacturerInput = {
  email: string;
  verificationCode: string;
};

export type LoginManufacturerInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
  securityContext?: {
    ipAddress: string;
    userAgent: string;
  };
};

export interface ManufacturerAuthResponse {
  token: string;
  manufacturerId: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  rememberToken?: string;
  manufacturer: any;
}

// ===== PASSWORD RESET TYPES =====

export type PasswordResetInput = {
  email?: string;
  securityContext?: SecurityContext;
};

export type PasswordResetConfirmInput = {
  token: string;
  newPassword: string;
  confirmPassword?: string;
  securityContext?: SecurityContext;
};

// ===== ANALYTICS TYPES =====

export interface AuthAnalytics {
  overview: {
    totalUsers: number;
    totalBusinesses: number;
    activeUsers: number;
    activeBusiness: number;
    verificationRate: number;
  };
  performance: {
    averageLoginTime: number;
    averageRegistrationTime: number;
    cacheHitRate: number;
    tokenValidationTime: number;
  };
  security: {
    failedLogins: number;
    suspiciousActivity: number;
    blockedIPs: number;
    passwordResetRequests: number;
  };
  trends: {
    dailyLogins: Record<string, number>;
    dailyRegistrations: Record<string, number>;
    loginSuccessRate: number;
  };
}

// ===== VERIFICATION & RESPONSE TYPES =====

export interface BusinessVerificationResponse {
  token: string;
  businessId: string;
  email: string;
  isEmailVerified: boolean;
}

export interface UserVerificationResponse {
  token: string;
  userId: string;
  email: string;
}

export interface ManufacturerVerificationResponse {
  token: string;
  manufacturerId: string;
  email: string;
  isEmailVerified: boolean;
}

export interface RegistrationResponse {
  businessId?: string;
  userId?: string;
  manufacturerId?: string;
  email: string;
  emailCode?: string;
  verificationCode?: string;
  verificationRequired: boolean;
}

// ===== TOKEN & SESSION TYPES =====

export interface TokenPayload {
  sub: string;
  type: 'business' | 'user' | 'manufacturer' | 'business_remember' | 'user_remember' | 'manufacturer_remember';
  email: string;
  iat?: number;
  exp?: number;
}

export interface SessionInfo {
  token: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  lastActivity: Date;
  location?: {
    country?: string;
    city?: string;
  };
}

// ===== ACCOUNT RESOLUTION TYPES =====

export interface AccountResolution {
  accountType: 'user' | 'business' | 'manufacturer';
  account: any;
  model: any;
}

// ===== OPTIONS TYPES =====

export interface AuthOptions {
  useCache?: boolean;
  includePassword?: boolean;
  accountType?: 'user' | 'business' | 'manufacturer' | 'both';
  includeUserData?: boolean;
}

export interface AnalyticsOptions {
  days?: number;
  includePerformance?: boolean;
  useCache?: boolean;
}

export interface LoginHistoryOptions {
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
}

export interface SecurityEventsOptions {
  page: number;
  limit: number;
  eventType?: string;
}

// ===== CACHE CONFIGURATION TYPES =====

export interface CacheTTLConfig {
  userLookup: number;
  tokenValidation: number;
  securityEvents: number;
  sessionData: number;
  authAnalytics: number;
  emailVerification: number;
  rateLimiting: number;
}

// ===== CONSTANTS =====

export const AUTH_CONSTANTS = {
  JWT_EXPIRES_IN: '7d',
  REMEMBER_TOKEN_EXPIRES_IN: '30d',
  PASSWORD_RESET_TOKEN_EXPIRES_IN: '15m',
  EMAIL_VERIFICATION_CODE_LENGTH: 6,
  PASSWORD_MIN_LENGTH: 8,
  BCRYPT_SALT_ROUNDS: 12,
} as const;

// ===== ENUMS =====

export enum AccountType {
  BUSINESS = 'business',
  USER = 'user',
  MANUFACTURER = 'manufacturer'
}

export enum AuthEventType {
  REGISTER_BUSINESS = 'REGISTER_BUSINESS',
  REGISTER_USER = 'REGISTER_USER',
  REGISTER_MANUFACTURER = 'REGISTER_MANUFACTURER',
  VERIFY_BUSINESS = 'VERIFY_BUSINESS',
  VERIFY_USER = 'VERIFY_USER',
  VERIFY_MANUFACTURER = 'VERIFY_MANUFACTURER',
  LOGIN_BUSINESS = 'LOGIN_BUSINESS',
  LOGIN_USER = 'LOGIN_USER',
  LOGIN_MANUFACTURER = 'LOGIN_MANUFACTURER',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_CONFIRM = 'PASSWORD_RESET_CONFIRM',
  RESEND_VERIFY_BUSINESS = 'RESEND_VERIFY_BUSINESS',
  RESEND_VERIFY_USER = 'RESEND_VERIFY_USER',
  RESEND_VERIFY_MANUFACTURER = 'RESEND_VERIFY_MANUFACTURER',
  LOGIN_USER_EMAIL_GATING_DENIED = 'LOGIN_USER_EMAIL_GATING_DENIED'
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  REMEMBER = 'remember',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification'
}

// ===== TYPE GUARDS =====

export function isBusinessInput(input: any): input is RegisterBusinessInput {
  return input && typeof input.businessName === 'string';
}

export function isUserInput(input: any): input is RegisterUserInput {
  return input && typeof input.email === 'string' && !input.businessName && !input.name;
}

export function isManufacturerInput(input: any): input is RegisterManufacturerInput {
  return input && typeof input.name === 'string' && typeof input.email === 'string';
}

// ===== UTILITY TYPES =====

export type AuthServiceMethod =
  | 'registerBusiness'
  | 'registerUser'
  | 'registerManufacturer'
  | 'verifyBusiness'
  | 'verifyUser'
  | 'verifyManufacturer'
  | 'loginBusiness'
  | 'loginUser'
  | 'loginManufacturer'
  | 'forgotPassword'
  | 'resetPassword';

export type AuthResult<T extends AuthServiceMethod> =
  T extends 'registerBusiness' ? RegistrationResponse :
  T extends 'registerUser' ? RegistrationResponse :
  T extends 'registerManufacturer' ? RegistrationResponse :
  T extends 'verifyBusiness' ? BusinessVerificationResponse :
  T extends 'verifyUser' ? UserVerificationResponse :
  T extends 'verifyManufacturer' ? ManufacturerVerificationResponse :
  T extends 'loginBusiness' ? BusinessAuthResponse :
  T extends 'loginUser' ? UserAuthResponse :
  T extends 'loginManufacturer' ? ManufacturerAuthResponse :
  void;