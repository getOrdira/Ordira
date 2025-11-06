/**
 * Authentication Types
 * 
 * Re-exports backend authentication types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  RegisterUserInput,
  RegisterBusinessInput,
  RegisterManufacturerInput,
  SecurityContext,
  UserPreferences as BackendUserPreferences,
  Location,
  VerifyBusinessInput,
  LoginBusinessInput,
  BusinessAuthResponse,
  BusinessVerificationResponse,
  VerifyUserInput,
  LoginUserInput,
  UserAuthResponse,
  UserVerificationResponse,
  VerifyManufacturerInput,
  LoginManufacturerInput,
  ManufacturerAuthResponse,
  ManufacturerVerificationResponse,
  PasswordResetInput,
  PasswordResetConfirmInput,
  RegistrationResponse,
  AuthAnalytics,
  AccountResolution,
  CacheTTLConfig,
  AuthOptions,
  TokenPayload
} from '@backend/services/auth/types/authTypes.service';

// Re-export all backend types
export type {
  SecurityContext,
  Location,
  RegisterBusinessInput,
  VerifyBusinessInput,
  LoginBusinessInput,
  BusinessAuthResponse,
  BusinessVerificationResponse,
  RegisterUserInput,
  VerifyUserInput,
  LoginUserInput,
  UserAuthResponse,
  UserVerificationResponse,
  RegisterManufacturerInput,
  VerifyManufacturerInput,
  LoginManufacturerInput,
  ManufacturerAuthResponse,
  ManufacturerVerificationResponse,
  PasswordResetInput,
  PasswordResetConfirmInput,
  RegistrationResponse,
  AuthAnalytics,
  AccountResolution,
  CacheTTLConfig,
  AuthOptions,
  TokenPayload
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Login credentials interface with frontend-specific fields
 * Extends backend LoginUserInput with rememberMe and deviceFingerprint
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  deviceFingerprint?: string;
}

/**
 * Business login credentials with frontend-specific fields
 * Extends backend LoginBusinessInput with rememberMe and deviceFingerprint
 */
export interface BusinessLoginCredentials {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  deviceFingerprint?: string;
}

/**
 * User registration data with frontend-specific fields
 * Extends backend RegisterUserInput with form-specific fields
 */
export interface RegisterUserData extends Omit<RegisterUserInput, 'securityContext'> {
  acceptTerms: boolean;
  marketingConsent?: boolean;
  deviceFingerprint?: string;
}

/**
 * Business registration data with frontend-specific fields
 * Extends backend RegisterBusinessInput with form-specific fields
 */
export interface RegisterBusinessData extends Omit<RegisterBusinessInput, 'securityContext' | 'dateOfBirth'> {
  dateOfBirth?: string | Date;
  acceptTerms: boolean;
  marketingConsent?: boolean;
  deviceFingerprint?: string;
  businessWebsite?: string;
  industry?: string;
  planType?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  contactName?: string;
  contactPhone?: string;
}

/**
 * Manufacturer registration data with frontend-specific fields
 * Extends backend RegisterManufacturerInput with form-specific fields
 */
export interface RegisterManufacturerData extends Omit<RegisterManufacturerInput, 'securityContext'> {
  acceptTerms: boolean;
  marketingConsent?: boolean;
  deviceFingerprint?: string;
  establishedYear?: number;
  employeeCount?: number;
  servicesOffered?: string[];
}

/**
 * Generic registration data union type
 */
export type RegisterData = RegisterUserData | RegisterBusinessData | RegisterManufacturerData;

/**
 * Email verification data - generic interface for all verification types
 */
export interface EmailVerificationData {
  email: string;
  code?: string;
  verificationCode?: string;
  emailCode?: string;
  phoneCode?: string;
  businessId?: string;
}

/**
 * Forgot password data
 */
export interface ForgotPasswordData {
  email: string;
}

/**
 * Reset password data
 */
export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

/**
 * Change password data (for authenticated users)
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

/**
 * Setup two-factor authentication data
 */
export interface SetupTwoFactorData {
  password: string;
  method?: 'totp' | 'sms' | 'email';
}

/**
 * Verify two-factor authentication data
 */
export interface VerifyTwoFactorData {
  code: string;
  backupCode?: string;
}

/**
 * Account recovery data
 */
export interface AccountRecoveryData {
  email: string;
  recoveryMethod?: 'email' | 'phone';
}

/**
 * Frontend-specific auth response types that extend backend types with refreshToken
 */
export interface FrontendUserAuthResponse extends UserAuthResponse {
  refreshToken?: string;
}

export interface FrontendBusinessAuthResponse extends BusinessAuthResponse {
  refreshToken?: string;
}

export interface FrontendManufacturerAuthResponse extends ManufacturerAuthResponse {
  refreshToken?: string;
}

/**
 * Generic auth response union type for frontend
 */
export type AuthResponse = FrontendUserAuthResponse | FrontendBusinessAuthResponse | FrontendManufacturerAuthResponse;

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  token: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Security settings interface
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'totp' | 'sms' | 'email';
  backupCodes?: string[];
  activeSessions: number;
  lastPasswordChange?: Date;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}