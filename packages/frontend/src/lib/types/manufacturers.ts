// src/lib/types/manufacturers.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Manufacturer plan types
 * Based on backend IManufacturer model plan field
 */
export type ManufacturerPlan = 'starter' | 'professional' | 'enterprise' | 'unlimited';

/**
 * Customization level types
 * Based on backend IManufacturer model manufacturingCapabilities customization field
 */
export type CustomizationLevel = 'none' | 'limited' | 'full';

/**
 * Preferred contact method types
 * Based on backend IManufacturer model preferredContactMethod field
 */
export type PreferredContactMethod = 'email' | 'phone' | 'message';

/**
 * Certification interface
 * Based on backend IManufacturer model certifications field
 */
export interface Certification {
  name: string;
  issuer: string;
  dateIssued?: Date;
  expiryDate?: Date;
  certificateUrl?: string;
}

/**
 * Headquarters interface
 * Based on backend IManufacturer model headquarters field
 */
export interface Headquarters {
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Manufacturing capabilities interface
 * Based on backend IManufacturer model manufacturingCapabilities field
 */
export interface ManufacturingCapabilities {
  productTypes?: string[];
  materials?: string[];
  processes?: string[];
  qualityStandards?: string[];
  customization?: CustomizationLevel;
  sustainabilityPractices?: string[];
}

/**
 * Connection requests interface
 * Based on backend IManufacturer model connectionRequests field
 */
export interface ConnectionRequests {
  sent: number;
  received: number;
  approved: number;
  rejected: number;
}

/**
 * Available hours interface
 * Based on backend IManufacturer model availableHours field
 */
export interface AvailableHours {
  start: string; // "09:00"
  end: string;   // "17:00"
  timezone: string;
}

/**
 * Manufacturer interface
 * Based on backend IManufacturer model
 */
export interface Manufacturer {
  _id: string;
  name: string;
  email: string;
  brands: string[]; // Brand ID references
  
  // Core Profile Information
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  
  // Enhanced Profile Information
  profilePictureUrl?: string;
  website?: string;
  socialUrls?: string[];
  
  // Account Status & Verification
  isActive?: boolean;
  deactivatedAt?: Date;
  isVerified?: boolean;
  verifiedAt?: Date;
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date;
  verificationToken?: string;
  
  // Subscription Plan
  plan?: ManufacturerPlan;
  
  // Business Information
  businessLicense?: string;
  certifications?: Certification[];
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: Headquarters;
  
  // Manufacturing Capabilities
  manufacturingCapabilities?: ManufacturingCapabilities;
  
  // Connection & Business Metrics
  totalConnections?: number;
  connectionRequests?: ConnectionRequests;
  averageResponseTime?: number; // in hours
  successfulProjects?: number;
  clientSatisfactionRating?: number; // 1-5 scale
  
  // Communication Preferences
  preferredContactMethod?: PreferredContactMethod;
  timezone?: string;
  availableHours?: AvailableHours;
  responseTimeCommitment?: number; // in hours
  
  // Security & Authentication
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  
  // Profile Analytics & Activity
  profileViews?: number;
  searchAppearances?: number;
  lastProfileUpdate?: Date;
  profileScore?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Manufacturer creation request
 * For creating new manufacturers
 */
export interface CreateManufacturerRequest {
  name: string;
  email: string;
  password: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  website?: string;
  socialUrls?: string[];
  businessLicense?: string;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: Headquarters;
  manufacturingCapabilities?: ManufacturingCapabilities;
  preferredContactMethod?: PreferredContactMethod;
  timezone?: string;
  availableHours?: AvailableHours;
  responseTimeCommitment?: number;
}

/**
 * Manufacturer update request
 * For updating existing manufacturers
 */
export interface UpdateManufacturerRequest {
  name?: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  website?: string;
  socialUrls?: string[];
  businessLicense?: string;
  certifications?: Certification[];
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: Headquarters;
  manufacturingCapabilities?: ManufacturingCapabilities;
  preferredContactMethod?: PreferredContactMethod;
  timezone?: string;
  availableHours?: AvailableHours;
  responseTimeCommitment?: number;
}

/**
 * Manufacturer list response
 * For paginated manufacturer lists
 */
export interface ManufacturerListResponse extends PaginatedResponse<Manufacturer> {
  manufacturers: Manufacturer[];
  analytics: {
    totalManufacturers: number;
    activeManufacturers: number;
    verifiedManufacturers: number;
    averageRating: number;
    totalConnections: number;
  };
}

/**
 * Manufacturer detail response
 * For detailed manufacturer information
 */
export interface ManufacturerDetailResponse {
  manufacturer: Manufacturer;
  analytics: {
    profileViews: number;
    searchAppearances: number;
    profileScore: number;
    lastProfileUpdate?: Date;
    connectionStats: ConnectionRequests;
    averageResponseTime: number;
    successfulProjects: number;
    clientSatisfactionRating: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
  connectedBrands: Array<{
    _id: string;
    businessName: string;
    logoUrl?: string;
    connectedAt: Date;
  }>;
}

/**
 * Manufacturer search response
 * For manufacturer search results
 */
export interface ManufacturerSearchResponse extends PaginatedResponse<Manufacturer> {
  manufacturers: Manufacturer[];
  filters: {
    industries: Array<{
      industry: string;
      count: number;
    }>;
    capabilities: Array<{
      capability: string;
      count: number;
    }>;
    locations: Array<{
      country: string;
      count: number;
    }>;
    plans: Array<{
      plan: ManufacturerPlan;
      count: number;
    }>;
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Manufacturer analytics response
 * For manufacturer analytics and reporting
 */
export interface ManufacturerAnalyticsResponse {
  overview: {
    totalManufacturers: number;
    activeManufacturers: number;
    verifiedManufacturers: number;
    averageRating: number;
    totalConnections: number;
    averageResponseTime: number;
  };
  industryDistribution: Array<{
    industry: string;
    count: number;
    percentage: number;
  }>;
  planDistribution: Array<{
    plan: ManufacturerPlan;
    count: number;
    percentage: number;
  }>;
  locationDistribution: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
  capabilityDistribution: Array<{
    capability: string;
    count: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    newManufacturers: number;
    connections: number;
    profileViews: number;
    searchAppearances: number;
  }>;
  topManufacturers: Array<{
    manufacturer: Manufacturer;
    metrics: {
      profileViews: number;
      searchAppearances: number;
      profileScore: number;
      connections: number;
      rating: number;
    };
  }>;
}

/**
 * Manufacturer discovery response
 * For manufacturer discovery and recommendations
 */
export interface ManufacturerDiscoveryResponse {
  featured: Manufacturer[];
  recommended: Manufacturer[];
  nearby: Manufacturer[];
  trending: Manufacturer[];
  categories: Array<{
    category: string;
    manufacturers: Manufacturer[];
  }>;
}

/**
 * Manufacturer connection request
 * For connecting with manufacturers
 */
export interface ManufacturerConnectionRequest {
  manufacturer: string;
  message?: string;
  projectDetails?: {
    title: string;
    description: string;
    budget?: number;
    timeline?: string;
    requirements?: string[];
  };
}

/**
 * Manufacturer settings interface
 * For manufacturer account settings
 */
export interface ManufacturerSettings {
  profile: {
    isPublic: boolean;
    showContactInfo: boolean;
    showCapabilities: boolean;
    showCertifications: boolean;
  };
  notifications: {
    newConnections: boolean;
    profileViews: boolean;
    searchAppearances: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
  privacy: {
    showLocation: boolean;
    showEmployeeCount: boolean;
    showEstablishedYear: boolean;
    showRevenue: boolean;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Manufacturer plan validation schema
 */
export const manufacturerPlanSchema = Joi.string()
  .valid('starter', 'professional', 'enterprise', 'unlimited')
  .optional()
  .messages({
    'any.only': 'Plan must be one of: starter, professional, enterprise, unlimited'
  });

/**
 * Customization level validation schema
 */
export const customizationLevelSchema = Joi.string()
  .valid('none', 'limited', 'full')
  .optional()
  .messages({
    'any.only': 'Customization level must be one of: none, limited, full'
  });

/**
 * Preferred contact method validation schema
 */
export const preferredContactMethodSchema = Joi.string()
  .valid('email', 'phone', 'message')
  .optional()
  .messages({
    'any.only': 'Preferred contact method must be one of: email, phone, message'
  });

/**
 * Certification validation schema
 */
export const certificationSchema = Joi.object({
  name: Joi.string().required(),
  issuer: Joi.string().required(),
  dateIssued: Joi.date().optional(),
  expiryDate: Joi.date().optional(),
  certificateUrl: commonSchemas.optionalUrl
});

/**
 * Headquarters validation schema
 */
export const headquartersSchema = Joi.object({
  country: Joi.string().optional(),
  city: Joi.string().optional(),
  address: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional()
});

/**
 * Manufacturing capabilities validation schema
 */
export const manufacturingCapabilitiesSchema = Joi.object({
  productTypes: Joi.array().items(Joi.string()).optional(),
  materials: Joi.array().items(Joi.string()).optional(),
  processes: Joi.array().items(Joi.string()).optional(),
  qualityStandards: Joi.array().items(Joi.string()).optional(),
  customization: customizationLevelSchema,
  sustainabilityPractices: Joi.array().items(Joi.string()).optional()
});

/**
 * Available hours validation schema
 */
export const availableHoursSchema = Joi.object({
  start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  timezone: Joi.string().required()
});

/**
 * Create manufacturer request validation schema
 */
export const createManufacturerRequestSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  email: commonSchemas.email.required(),
  password: Joi.string().min(8).max(128).required(),
  industry: Joi.string().max(100).optional(),
  description: Joi.string().max(2000).optional(),
  contactEmail: commonSchemas.optionalEmail,
  servicesOffered: Joi.array().items(Joi.string().max(100)).optional(),
  moq: Joi.number().min(1).optional(),
  website: commonSchemas.optionalUrl,
  socialUrls: Joi.array().items(commonSchemas.url).max(10).optional(),
  businessLicense: Joi.string().max(100).optional(),
  establishedYear: Joi.number().min(1800).max(new Date().getFullYear()).optional(),
  employeeCount: Joi.number().min(1).optional(),
  headquarters: headquartersSchema.optional(),
  manufacturingCapabilities: manufacturingCapabilitiesSchema.optional(),
  preferredContactMethod: preferredContactMethodSchema,
  timezone: Joi.string().optional(),
  availableHours: availableHoursSchema.optional(),
  responseTimeCommitment: Joi.number().min(1).max(168).optional() // 1 hour to 1 week
});

/**
 * Update manufacturer request validation schema
 */
export const updateManufacturerRequestSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  industry: Joi.string().max(100).optional(),
  description: Joi.string().max(2000).optional(),
  contactEmail: commonSchemas.optionalEmail,
  servicesOffered: Joi.array().items(Joi.string().max(100)).optional(),
  moq: Joi.number().min(1).optional(),
  profilePictureUrl: commonSchemas.optionalUrl,
  website: commonSchemas.optionalUrl,
  socialUrls: Joi.array().items(commonSchemas.url).max(10).optional(),
  businessLicense: Joi.string().max(100).optional(),
  certifications: Joi.array().items(certificationSchema).optional(),
  establishedYear: Joi.number().min(1800).max(new Date().getFullYear()).optional(),
  employeeCount: Joi.number().min(1).optional(),
  headquarters: headquartersSchema.optional(),
  manufacturingCapabilities: manufacturingCapabilitiesSchema.optional(),
  preferredContactMethod: preferredContactMethodSchema,
  timezone: Joi.string().optional(),
  availableHours: availableHoursSchema.optional(),
  responseTimeCommitment: Joi.number().min(1).max(168).optional()
});

/**
 * Manufacturer query validation schema
 */
export const manufacturerQuerySchema = Joi.object({
  industry: Joi.string().optional(),
  plan: manufacturerPlanSchema.optional(),
  isActive: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  country: Joi.string().optional(),
  city: Joi.string().optional(),
  capabilities: Joi.array().items(Joi.string()).optional(),
  minRating: Joi.number().min(1).max(5).optional(),
  maxResponseTime: Joi.number().min(1).optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'createdAt', 'profileScore', 'clientSatisfactionRating', 'averageResponseTime').default('profileScore'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Manufacturer connection request validation schema
 */
export const manufacturerConnectionRequestSchema = Joi.object({
  manufacturer: commonSchemas.mongoId.required(),
  message: Joi.string().max(1000).optional(),
  projectDetails: Joi.object({
    title: Joi.string().max(200).required(),
    description: Joi.string().max(2000).required(),
    budget: Joi.number().min(0).optional(),
    timeline: Joi.string().max(100).optional(),
    requirements: Joi.array().items(Joi.string().max(200)).optional()
  }).optional()
});

/**
 * Export all manufacturer validation schemas
 */
export const manufacturerValidationSchemas = {
  manufacturerPlan: manufacturerPlanSchema,
  customizationLevel: customizationLevelSchema,
  preferredContactMethod: preferredContactMethodSchema,
  certification: certificationSchema,
  headquarters: headquartersSchema,
  manufacturingCapabilities: manufacturingCapabilitiesSchema,
  availableHours: availableHoursSchema,
  createManufacturerRequest: createManufacturerRequestSchema,
  updateManufacturerRequest: updateManufacturerRequestSchema,
  manufacturerQuery: manufacturerQuerySchema,
  manufacturerConnectionRequest: manufacturerConnectionRequestSchema
};
