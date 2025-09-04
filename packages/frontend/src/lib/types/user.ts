// src/lib/types/user.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';

/**
 * Defines the possible roles a user can have within the application.
 * - 'customer' aligns with general user schemas like registerUserSchema
 * - 'manufacturer' and 'brand' for role-specific extensions
 */
export type UserRole = 'customer' | 'manufacturer' | 'brand';

/**
 * User preferences structure
 * Expanded to fully match backend accountSettingsSchema communication section
 */
export interface UserPreferences {
  language: string; // Valid codes from schema, default 'en'
  timezone: string; // Max 50 chars, default 'UTC'
  emailFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never'; // Default 'daily'
  marketingEmails: boolean; // Default false
  productUpdates: boolean; // Default true
  securityNotifications: boolean; // Default true
  emailNotifications: boolean; // Inferred general toggle
  smsNotifications: boolean; // Inferred general toggle
}

/**
 * User privacy settings
 * Matches backend accountSettingsSchema privacy section
 */
export interface UserPrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts'; // Default 'public'
  showEmail: boolean; // Default false
  showPhone: boolean; // Default false
  showLocation: boolean; // Default true
  allowSearch: boolean; // Default true
  allowRecommendations: boolean; // Default true
}

/**
 * User security settings
 * Matches backend accountSettingsSchema security section
 */
export interface UserSecuritySettings {
  twoFactorEnabled: boolean; // Default false
  loginNotifications: boolean; // Default true
  securityAlerts: boolean; // Default true
  sessionTimeout: number; // In minutes, default 480, min 15, max 10080
}

/**
 * Full user settings
 * Mirrors backend accountSettingsSchema structure
 */
export interface UserSettings {
  privacy: UserPrivacySettings;
  security: UserSecuritySettings;
  communication: UserPreferences; // Reusing preferences for communication
}

/**
 * User analytics structure matching backend IUser model
 */
export interface UserAnalytics {
  totalVotes: number;
  totalSessions: number;
  averageSessionDuration: number; // in minutes
  lastActiveAt: string;
  deviceInfo?: string;
  referralSource?: string;
}

/**
 * Voting history entry structure
 * UPDATED: Fixed to match new product selection voting system
 */
export interface VotingHistoryEntry {
  proposalId: string;
  businessId: string;
  selectedProductId: string; // Changed from productId - now matches backend
  productName?: string; // Added to match backend VotingRecord
  productImageUrl?: string; // Added to match backend VotingRecord
  selectionReason?: string; // Added to match backend VotingRecord
  votedAt: string;
  ipAddress?: string;
  userAgent?: string;
  // Removed: vote field (was 'yes' | 'no' | 'abstain' but backend uses product selection)
}

/**
 * Brand interaction entry structure
 */
export interface BrandInteraction {
  businessId: string;
  firstInteraction: string;
  lastInteraction: string;
  totalVotes: number;
  totalPageViews: number;
  favoriteProducts: string[];
}

/**
 * Base User interface for customer users
 * Aligned with backend IUser model and registerUserSchema (required fields enforced)
 */
export interface User {
  _id: string;
  email: string;
  role: UserRole;
  
  // Basic information from registerUserSchema
  firstName: string; // Required
  lastName: string; // Required
  fullName?: string; // Virtual property from backend
  phone?: string; // Optional, international format
  dateOfBirth?: string | Date; // Optional, min 1900-01-01, max now
  profilePictureUrl?: string;
  
  // Email verification
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  
  // Security and authentication
  lastLoginAt?: string;
  loginAttempts: number;
  twoFactorEnabled: boolean;
  
  // Full settings mirroring accountSettingsSchema
  settings: UserSettings;
  
  // Voting and interactions (for customer users)
  votingHistory: VotingHistoryEntry[];
  brandInteractions: BrandInteraction[];
  
  // Analytics
  analytics: UserAnalytics;
  
  // Account status from listUsersQuerySchema
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  suspendedAt?: string;
  suspensionReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Manufacturer-specific user interface
 * Aligns with backend IManufacturer model, extending base with role-specific fields
 */
export interface ManufacturerUser extends Omit<User, 'role' | 'votingHistory' | 'brandInteractions'> {
  role: 'manufacturer';
  name: string; // Company/business name, required
  
  // Core profile information
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number; // Minimum order quantity
  
  // Enhanced profile information
  website?: string;
  socialUrls?: string[];
  
  // Account status & verification
  isActive: boolean;
  deactivatedAt?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verificationToken?: string;
  
  // Business information
  businessLicense?: string;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
    postalCode?: string;
  };
  
  // Manufacturing capabilities
  manufacturingCapabilities?: {
    productTypes?: string[];
    materials?: string[];
    processes?: string[];
    qualityStandards?: string[];
    customization?: 'none' | 'limited' | 'full';
    sustainabilityPractices?: string[];
  };
  
  // Connection metrics
  totalConnections: number;
  connectionRequests?: {
    sent: number;
    received: number;
    approved: number;
    rejected: number;
  };
  successfulProjects: number;
  clientSatisfactionRating?: number;
  
  // Activity tracking
  profileViews: number;
  searchAppearances: number;
  lastProfileUpdate?: string;
  profileScore: number;
  
  // Connected brands
  brands: string[]; // Array of BrandSettings IDs
}

/**
 * Brand-specific user interface
 * Represents the business entity that connects to manufacturers
 */
export interface BrandUser extends Omit<User, 'role' | 'votingHistory' | 'brandInteractions'> {
  role: 'brand';
  
  // Business information
  businessName: string; // Required
  businessEmail?: string;
  website?: string;
  industry?: string;
  description?: string;
  
  // Brand settings reference
  brandSettingsId?: string;
  
  // Verification status
  isVerified: boolean;
  verifiedAt?: string;
  
  // Activity metrics
  totalProducts?: number;
  totalCertificates?: number;
  totalVotes?: number;
  
  // Connected manufacturers
  connectedManufacturers?: string[];
}

/**
 * Authentication session interface
 */
export interface AuthSession {
  user: User | ManufacturerUser | BrandUser;
  token: string;
  refreshToken?: string;
}

/**
 * User list response for paginated queries
 * Aligned with backend listUsersQuerySchema for pagination/sorting
 */
export interface UserListResponse {
  users: AnyUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Type guard functions for user role checking
 */
export function isCustomerUser(user: User | ManufacturerUser | BrandUser): user is User {
  return user.role === 'customer';
}

export function isManufacturerUser(user: User | ManufacturerUser | BrandUser): user is ManufacturerUser {
  return user.role === 'manufacturer';
}

export function isBrandUser(user: User | ManufacturerUser | BrandUser): user is BrandUser {
  return user.role === 'brand';
}

/**
 * Union type for all user types
 */
export type AnyUser = User | ManufacturerUser | BrandUser;

/**
 * User profile update interfaces
 * Based on updateUserProfileSchema (partial updates)
 */
export interface UpdateUserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string | Date;
  profilePictureUrl?: string;
  settings?: Partial<UserSettings>;
}

export interface UpdateManufacturerProfile extends UpdateUserProfile {
  name?: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  website?: string;
  socialUrls?: string[];
}

export interface UpdateBrandProfile extends UpdateUserProfile {
  businessName?: string;
  businessEmail?: string;
  website?: string;
  industry?: string;
  description?: string;
}

// ===== JOI VALIDATION SCHEMAS =====
// Aligned with backend user validation schemas

/**
 * User preferences validation schema
 * Matches backend accountSettingsSchema communication section
 */
export const userPreferencesSchema = Joi.object<UserPreferences>({
  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko')
    .default('en')
    .messages({
      'any.only': 'Language must be one of: en, es, fr, de, pt, zh, ja, ko'
    }),
  
  timezone: Joi.string()
    .max(50)
    .default('UTC')
    .messages({
      'string.max': 'Timezone cannot exceed 50 characters'
    }),
  
  emailFrequency: Joi.string()
    .valid('immediate', 'hourly', 'daily', 'weekly', 'never')
    .default('daily')
    .messages({
      'any.only': 'Email frequency must be immediate, hourly, daily, weekly, or never'
    }),
  
  marketingEmails: Joi.boolean().default(false),
  productUpdates: Joi.boolean().default(true),
  securityNotifications: Joi.boolean().default(true),
  emailNotifications: Joi.boolean().default(true),
  smsNotifications: Joi.boolean().default(false)
});

/**
 * User privacy settings validation schema
 * Matches backend accountSettingsSchema privacy section
 */
export const userPrivacySettingsSchema = Joi.object<UserPrivacySettings>({
  profileVisibility: Joi.string()
    .valid('public', 'private', 'contacts')
    .default('public')
    .messages({
      'any.only': 'Profile visibility must be public, private, or contacts'
    }),
  showEmail: Joi.boolean().default(false),
  showPhone: Joi.boolean().default(false),
  showLocation: Joi.boolean().default(true),
  allowSearch: Joi.boolean().default(true),
  allowRecommendations: Joi.boolean().default(true)
});

/**
 * User security settings validation schema
 * Matches backend accountSettingsSchema security section
 */
export const userSecuritySettingsSchema = Joi.object<UserSecuritySettings>({
  twoFactorEnabled: Joi.boolean().default(false),
  loginNotifications: Joi.boolean().default(true),
  securityAlerts: Joi.boolean().default(true),
  sessionTimeout: Joi.number()
    .integer()
    .min(15)
    .max(10080) // 7 days in minutes
    .default(480) // 8 hours
    .messages({
      'number.integer': 'Session timeout must be an integer',
      'number.min': 'Session timeout must be at least 15 minutes',
      'number.max': 'Session timeout cannot exceed 7 days (10080 minutes)'
    })
});

/**
 * Full user settings validation schema
 * Mirrors backend accountSettingsSchema structure
 */
export const userSettingsSchema = Joi.object<UserSettings>({
  privacy: userPrivacySettingsSchema.optional(),
  security: userSecuritySettingsSchema.optional(),
  communication: userPreferencesSchema.optional()
});

/**
 * Update user profile validation schema
 * Based on backend updateUserProfileSchema (partial updates)
 */
export const updateUserProfileSchema = Joi.object<UpdateUserProfile>({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  phone: commonSchemas.optionalPhone,
  dateOfBirth: commonSchemas.dateOfBirth,
  profilePictureUrl: commonSchemas.optionalUrl,
  settings: userSettingsSchema.optional()
});

/**
 * Update manufacturer profile validation schema
 * Based on backend updateManufacturerProfileSchema
 */
export const updateManufacturerProfileSchema = Joi.object<UpdateManufacturerProfile>({
  name: commonSchemas.businessName.optional(),
  industry: commonSchemas.industry,
  description: commonSchemas.optionalLongText,
  contactEmail: commonSchemas.optionalEmail,
  servicesOffered: commonSchemas.servicesOffered,
  moq: commonSchemas.moq,
  website: commonSchemas.optionalUrl,
  socialUrls: Joi.array()
    .items(commonSchemas.url)
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 social URLs'
    }),
  
  // Include base user profile fields
  firstName: updateUserProfileSchema.extract('firstName'),
  lastName: updateUserProfileSchema.extract('lastName'),
  phone: updateUserProfileSchema.extract('phone'),
  dateOfBirth: updateUserProfileSchema.extract('dateOfBirth'),
  profilePictureUrl: updateUserProfileSchema.extract('profilePictureUrl'),
  settings: updateUserProfileSchema.extract('settings')
});

/**
 * Update brand profile validation schema
 * Based on backend updateBrandProfileSchema patterns
 */
export const updateBrandProfileSchema = Joi.object<UpdateBrandProfile>({
  businessName: commonSchemas.businessName.optional(),
  businessEmail: commonSchemas.optionalEmail,
  website: commonSchemas.optionalUrl,
  industry: commonSchemas.industry,
  description: commonSchemas.optionalLongText,
  
  // Include base user profile fields
  firstName: updateUserProfileSchema.extract('firstName'),
  lastName: updateUserProfileSchema.extract('lastName'),
  phone: updateUserProfileSchema.extract('phone'),
  dateOfBirth: updateUserProfileSchema.extract('dateOfBirth'),
  profilePictureUrl: updateUserProfileSchema.extract('profilePictureUrl'),
  settings: updateUserProfileSchema.extract('settings')
});

/**
 * Voting history entry validation schema
 * UPDATED: Matches new product selection system
 */
export const votingHistoryEntrySchema = Joi.object<VotingHistoryEntry>({
  proposalId: Joi.string()
    .trim()
    .max(100)
    .required()
    .messages({
      'string.max': 'Proposal ID cannot exceed 100 characters',
      'any.required': 'Proposal ID is required'
    }),
  
  businessId: commonSchemas.mongoId.required(),
  
  selectedProductId: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Product ID can only contain letters, numbers, hyphens and underscores',
      'string.max': 'Product ID cannot exceed 100 characters',
      'any.required': 'Selected product ID is required'
    }),
  
  productName: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Product name cannot exceed 200 characters'
    }),
  
  productImageUrl: commonSchemas.optionalUrl,
  
  selectionReason: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Selection reason cannot exceed 1000 characters'
    }),
  
  votedAt: commonSchemas.date.required(),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().max(500).optional()
});

/**
 * Export all user validation schemas for easy importing
 */
export const userValidationSchemas = {
  userPreferences: userPreferencesSchema,
  userPrivacySettings: userPrivacySettingsSchema,
  userSecuritySettings: userSecuritySettingsSchema,
  userSettings: userSettingsSchema,
  updateUserProfile: updateUserProfileSchema,
  updateManufacturerProfile: updateManufacturerProfileSchema,
  updateBrandProfile: updateBrandProfileSchema,
  votingHistoryEntry: votingHistoryEntrySchema
};