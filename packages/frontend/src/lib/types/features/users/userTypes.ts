/**
 * User Types
 * 
 * Re-exports backend user types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  UserPreferences,
  UserAddress,
  CreateUserData,
  UpdateUserData,
  UserSearchParams,
  UserProfile,
  UserAnalytics
} from '@backend/services/users/utils/types';

// Re-export all backend types
export type {
  UserPreferences,
  UserAddress,
  CreateUserData,
  UpdateUserData,
  UserSearchParams,
  UserProfile,
  UserAnalytics
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====

/**
 * User roles - frontend-specific type
 */
export type UserRole = 'customer' | 'manufacturer' | 'brand' | 'creator';

/**
 * Extended user preferences with frontend-specific fields
 * Extends backend UserPreferences with additional UI preferences
 */
export interface ExtendedUserPreferences extends UserPreferences {
  language: string;
  timezone: string;
  emailFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  productUpdates: boolean;
  securityNotifications: boolean;
}

/**
 * User privacy settings - frontend-specific
 */
export interface UserPrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  allowSearch: boolean;
  allowRecommendations: boolean;
}

/**
 * User security settings - frontend-specific
 */
export interface UserSecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  securityAlerts: boolean;
  sessionTimeout: number;
}

/**
 * User type discriminator - frontend-specific
 */
export type AnyUser = BrandUser | CreatorUser | ManufacturerUser | CustomerUser;

/**
 * Brand user type - frontend-specific
 */
export interface BrandUser {
  id: string;
  role: 'brand';
  email: string;
  businessId: string;
  businessName: string;
  isEmailVerified: boolean;
  plan?: string;
}

export interface CreatorUser {
  id: string;
  role: 'creator';
  email: string;
  isEmailVerified: boolean;
  businessId?: string;
  businessName?: string;
  plan?: string;
}

/**
 * Manufacturer user type - frontend-specific
 */
export interface ManufacturerUser {
  id: string;
  role: 'manufacturer';
  email: string;
  manufacturerId: string;
  manufacturerName: string;
  isEmailVerified: boolean;
}

/**
 * Customer user type - frontend-specific
 */
export interface CustomerUser {
  id: string;
  role: 'customer';
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
}

/**
 * Helper to check if user is a brand user
 */
export function isBrandUser(user: AnyUser): user is BrandUser {
  return user.role === 'brand';
}

export function isCreatorUser(user: AnyUser): user is CreatorUser {
  return user.role === 'creator';
}

/**
 * Helper to check if user is a manufacturer user
 */
export function isManufacturerUser(user: AnyUser): user is ManufacturerUser {
  return user.role === 'manufacturer';
}

/**
 * Helper to check if user is a customer user
 */
export function isCustomerUser(user: AnyUser): user is CustomerUser {
  return user.role === 'customer';
}