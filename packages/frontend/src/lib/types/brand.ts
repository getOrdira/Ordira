// src/lib/types/brand.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { AnyUser, UserRole } from './user';
import { ApiResponse, PaginatedResponse, SimplePaginatedResponse, ValidationError, TimeRange, Configuration, KeyValuePair } from './common';

/**
 * Brand settings interface
 * Based on backend IBrandSettings model
 */
export interface BrandSettings {
  _id: string;
  business: string; // Business ID reference
  
  // Visual branding
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  customCss?: string;
  
  // Domain configuration
  subdomain?: string;
  customDomain?: string;
  enableSsl?: boolean;
  
  // Certificate wallet
  certificateWallet?: string;
  
  // Email Gating Configuration
  emailGating?: {
    enabled: boolean;
    mode: 'whitelist' | 'blacklist' | 'disabled';
    allowUnregistered: boolean;
    requireApproval: boolean;
    autoSyncEnabled: boolean;
    syncSources: ('shopify' | 'woocommerce' | 'csv' | 'api')[];
    welcomeEmailEnabled: boolean;
    accessDeniedMessage: string;
    
    // Advanced gating settings
    gatingRules?: {
      domainWhitelist?: string[];
      domainBlacklist?: string[];
      emailPatterns?: string[];
      maxVotesPerEmail?: number;
      votingWindow?: {
        enabled: boolean;
        startDate?: string;
        endDate?: string;
        timezone?: string;
      };
      geographicRestrictions?: {
        enabled: boolean;
        allowedCountries?: string[];
        blockedCountries?: string[];
      };
      ipWhitelist?: string[];
      ipBlacklist?: string[];
    };
    
    // Analytics and monitoring
    gatingAnalytics?: {
      totalEmailsChecked: number;
      totalEmailsAllowed: number;
      totalEmailsDenied: number;
      lastResetDate?: string;
      dailyStats?: {
        date: string;
        checked: number;
        allowed: number;
        denied: number;
        topDenialReasons: string[];
      }[];
    };
    
    // Integration settings
    integrationSettings?: {
      syncWithCRM?: boolean;
      crmWebhookUrl?: string;
      notifyOnDenial?: boolean;
      notifyOnApproval?: boolean;
      customWebhookUrl?: string;
      slackNotifications?: {
        enabled: boolean;
        webhookUrl?: string;
        channel?: string;
        notifyOnDenial?: boolean;
        notifyOnApproval?: boolean;
      };
    };
  };
  
  // E-commerce integrations
  shopifyDomain?: string;
  shopifyAccessToken?: string;
  shopifyWebhookSecret?: string;
  shopifyConfig?: {
    syncProducts?: boolean;
    syncOrders?: boolean;
    configuredBy?: string;
    configuredAt?: string;
  };
  shopifyUpdatedAt?: string;
  
  wooDomain?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
  wooUpdatedAt?: string;
  
  wixDomain?: string;
  wixApiKey?: string;
  wixRefreshToken?: string;
  
  // Enhanced Web3 settings
  web3Settings?: {
    certificateWallet?: string;
    walletType?: 'metamask' | 'walletconnect' | 'coinbase' | 'hardware' | 'other';
    walletVerified?: boolean;
    walletVerifiedAt?: string;
    walletSignature?: string;
    voteContract?: string;
    transferHealth?: string;
    nftContract?: string;
    chainId?: number;
    networkName?: string;
    gasSettings?: {
      maxGasPrice?: number;
      gasLimit?: number;
      priorityFee?: number;
    };
    autoTransferEnabled?: boolean;
    transferDelayMinutes?: number;
    transferTimeout?: number;
    transferScheduled?: boolean;
    transferDelay?: number;
    gasUsed?: string;
  };
  
  // Transfer preferences
  transferPreferences?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    brandWallet?: string;
    requireCustomerConfirmation?: boolean;
    gasOptimization?: boolean;
  };
  
  // Plan and billing
  plan: 'foundation' | 'growth' | 'premium' | 'enterprise';
  planLevel?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  planUpgradedAt?: string;
  planDowngradedAt?: string;
  planChangeReason?: string;
  planChangeBy?: string;
  trialEndDate?: string;
  isTrialActive?: boolean;
  planLimits?: {
    apiCalls: number;
    certificates: number;
    votes: number;
  };
  
  // Analytics and metrics
  analytics?: {
    totalCertificates?: number;
    totalVotes?: number;
    totalProducts?: number;
    totalPageViews?: number;
    totalUniqueVisitors?: number;
    engagementRate?: number;
    conversionRate?: number;
    bounceRate?: number;
    averageSessionDuration?: number;
    lastUpdated?: string;
  };
  
  transferAnalytics?: {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    averageTransferTime: number;
    lastTransferAt?: string;
    lastFailureAt?: string;
    failureReasons?: string[];
  };
  
  // Notifications
  notificationSettings?: {
    emailNotifications?: boolean;
    slackWebhook?: string;
    transferSuccess?: boolean;
    transferFailure?: boolean;
    planChanges?: boolean;
    usageWarnings?: boolean;
  };
  
  // Metadata
  version?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Domain mapping interface
 * Based on backend IDomainMapping model
 */
export interface DomainMapping {
  _id: string;
  business: string; // Business ID reference
  hostname: string; // Legacy field
  domain: string; // Primary domain field
  
  // Status and configuration
  status: 'pending_verification' | 'active' | 'error' | 'deleting';
  certificateType: 'letsencrypt' | 'custom';
  forceHttps: boolean;
  autoRenewal: boolean;
  
  // Enhanced verification fields
  isActive: boolean;
  isVerified: boolean;
  verificationMethod: 'dns' | 'file' | 'email';
  verificationToken?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  
  // SSL configuration
  sslEnabled: boolean;
  sslExpiresAt?: string;
  sslStatus: 'unknown' | 'active' | 'expired' | 'expiring_soon' | 'error';
  certificateExpiry?: string;
  certificateInfo?: {
    issuer: string;
    validFrom: string;
    validTo: string;
    fingerprint?: string;
    serialNumber?: string;
  };
  lastCertificateRenewal?: string;
  renewedBy?: string;
  
  // Custom certificate data
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
    uploadedAt: string;
    uploadedBy: string;
  };
  
  // DNS and CNAME configuration
  cnameTarget: string;
  dnsRecords?: {
    type: 'CNAME' | 'A' | 'TXT';
    name: string;
    value: string;
    ttl?: number;
    required?: boolean;
  }[];
  dnsStatus: 'unknown' | 'verified' | 'error' | 'pending';
  
  // Health monitoring
  healthStatus: 'unknown' | 'healthy' | 'warning' | 'error';
  lastHealthCheck?: string;
  averageResponseTime?: number;
  uptimePercentage?: number;
  lastDowntime?: string;
  
  // Performance metrics
  performanceMetrics?: {
    responseTime: number;
    uptime: number;
    errorRate: number;
    lastChecked: string;
  };
  
  // Analytics tracking
  lastAccessedAt?: string;
  requestCount: number;
  analyticsData?: {
    totalRequests: number;
    uniqueVisitors: number;
    errorCount: number;
    lastReset: string;
  };
  
  // Plan and configuration metadata
  planLevel: 'foundation' | 'growth' | 'premium' | 'enterprise';
  createdBy: string;
  updatedBy?: string;
  mappingMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    timestamp?: string;
    changedFields?: string[];
    updateReason?: string;
  };
  
  // Deletion tracking
  deletedBy?: string;
  deletionReason?: string;
  
  // Additional fields
  updateMetadata?: {
    changedFields?: string[];
    updateReason?: string;
    ipAddress?: string;
    timestamp?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * API Key interface
 * Based on backend IApiKey model
 */
export interface ApiKey {
  _id: string;
  business: string; // Business ID reference
  keyId: string;
  hashedSecret: string;
  revoked: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Core API key properties
  name: string;
  permissions: string[];
  expiresAt?: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  description?: string;
  planLevel?: string;
  
  // Creation tracking
  createdBy?: string;
  
  // Revocation tracking
  revokedAt?: string;
  revokedBy?: string;
  reason?: string;
  
  // Rotation tracking
  rotatedAt?: string;
  rotatedBy?: string;
  rotationReason?: string;
  
  // Update tracking
  updatedBy?: string;
  
  // Usage tracking
  lastUsed?: string;
  usageCount: number;
  
  // Security & access control
  isActive?: boolean;
  scopes?: string[];
}

/**
 * Business interface
 * Based on backend IBusiness model, aligned with BrandUser in user.ts
 */
export interface Business {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  businessName: string;
  regNumber?: string;
  taxId?: string;
  address: string;
  password: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailCode?: string;
  createdAt: string;
  updatedAt: string;
  profilePictureUrl?: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  walletAddress?: string;
  certificateWallet: string;
  
  // Additional security and account management
  lastLoginAt?: string;
  loginAttempts?: number;
  lockUntil?: string;
  
  // Password reset fields
  passwordResetCode?: string;
  passwordResetExpires?: string;
  passwordResetAttempts?: number;
  lastPasswordResetAttempt?: string;
  lastPasswordChangeAt?: string;
  
  // Enhanced profile
  website?: string;
  phoneNumber?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  yearEstablished?: number;
}

/**
 * Collection interface
 * Based on backend ICollection model
 */
export interface Collection {
  _id: string;
  business: string; // Business ID reference
  title: string;
  description?: string;
  products: string[]; // Product IDs
  
  // Enhanced fields
  slug?: string;
  isPublic: boolean;
  isActive: boolean;
  featuredImage?: string;
  tags: string[];
  sortOrder: number;
  
  // SEO and metadata
  metaDescription?: string;
  metaKeywords?: string[];
  
  // Analytics
  viewCount: number;
  lastViewedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Type guards for brand interfaces
 */
export function isBrandSettings(obj: any): obj is BrandSettings {
  return obj && typeof obj._id === 'string' && typeof obj.business === 'string';
}

export function isDomainMapping(obj: any): obj is DomainMapping {
  return obj && typeof obj._id === 'string' && typeof obj.domain === 'string';
}

export function isApiKey(obj: any): obj is ApiKey {
  return obj && typeof obj._id === 'string' && typeof obj.keyId === 'string';
}

// ===== JOI VALIDATION SCHEMAS =====
// Aligned with backend brand validation schemas

/**
 * Brand settings update validation schema
 * Based on backend updateBrandSettings schema
 */
export const updateBrandSettingsSchema = Joi.object({
  themeColor: commonSchemas.hexColor,
  logoUrl: commonSchemas.optionalUrl,
  bannerImages: Joi.array()
    .items(commonSchemas.url)
    .max(5)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 5 banner images'
    }),
  customCss: Joi.string()
    .max(10000)
    .optional()
    .messages({
      'string.max': 'Custom CSS cannot exceed 10,000 characters'
    }),
  subdomain: commonSchemas.subdomain.optional(),
  customDomain: Joi.string()
    .domain()
    .optional()
    .messages({
      'string.domain': 'Must be a valid domain name'
    }),
  enableSsl: Joi.boolean().default(true),
  certificateWallet: commonSchemas.ethereumAddress.optional()
});

/**
 * Email gating configuration validation schema
 * Based on backend email gating patterns
 */
export const emailGatingConfigSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  mode: Joi.string()
    .valid('whitelist', 'blacklist', 'disabled')
    .default('disabled')
    .messages({
      'any.only': 'Mode must be whitelist, blacklist, or disabled'
    }),
  allowUnregistered: Joi.boolean().default(false),
  requireApproval: Joi.boolean().default(false),
  autoSyncEnabled: Joi.boolean().default(false),
  syncSources: Joi.array()
    .items(Joi.string().valid('shopify', 'woocommerce', 'csv', 'api'))
    .max(4)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 4 sync sources'
    }),
  welcomeEmailEnabled: Joi.boolean().default(true),
  accessDeniedMessage: Joi.string()
    .max(500)
    .default('Access denied. Please contact support.')
    .messages({
      'string.max': 'Access denied message cannot exceed 500 characters'
    }),
  
  gatingRules: Joi.object({
    domainWhitelist: Joi.array()
      .items(Joi.string().domain())
      .max(100)
      .optional(),
    domainBlacklist: Joi.array()
      .items(Joi.string().domain())
      .max(100)
      .optional(),
    emailPatterns: Joi.array()
      .items(Joi.string().max(100))
      .max(20)
      .optional(),
    maxVotesPerEmail: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .optional(),
    votingWindow: Joi.object({
      enabled: Joi.boolean().default(false),
      startDate: commonSchemas.date.optional(),
      endDate: commonSchemas.date.optional(),
      timezone: Joi.string().max(50).default('UTC')
    }).optional(),
    geographicRestrictions: Joi.object({
      enabled: Joi.boolean().default(false),
      allowedCountries: Joi.array()
        .items(Joi.string().max(100))
        .max(250)
        .optional(),
      blockedCountries: Joi.array()
        .items(Joi.string().max(100))
        .max(250)
        .optional()
    }).optional(),
    ipWhitelist: Joi.array()
      .items(Joi.string().ip())
      .max(100)
      .optional(),
    ipBlacklist: Joi.array()
      .items(Joi.string().ip())
      .max(100)
      .optional()
  }).optional()
});

/**
 * Web3 settings validation schema
 * Based on backend Web3 integration patterns
 */
export const web3SettingsSchema = Joi.object({
  certificateWallet: commonSchemas.ethereumAddress.optional(),
  walletType: Joi.string()
    .valid('metamask', 'walletconnect', 'coinbase', 'hardware', 'other')
    .optional(),
  walletVerified: Joi.boolean().default(false),
  walletVerifiedAt: commonSchemas.date.optional(),
  walletSignature: Joi.string().optional(),
  voteContract: commonSchemas.ethereumAddress.optional(),
  nftContract: commonSchemas.ethereumAddress.optional(),
  chainId: Joi.number()
    .integer()
    .valid(1, 5, 137, 80001, 56, 97) // Ethereum, Goerli, Polygon, Mumbai, BSC, BSC Testnet
    .optional(),
  networkName: Joi.string()
    .valid('ethereum', 'goerli', 'polygon', 'mumbai', 'bsc', 'bsc-testnet')
    .optional(),
  gasSettings: Joi.object({
    maxGasPrice: Joi.number().min(0).optional(),
    gasLimit: Joi.number().integer().min(21000).optional(),
    priorityFee: Joi.number().min(0).optional()
  }).optional(),
  autoTransferEnabled: Joi.boolean().default(false),
  transferDelayMinutes: Joi.number()
    .integer()
    .min(0)
    .max(10080) // 7 days max
    .optional(),
  transferTimeout: Joi.number()
    .integer()
    .min(30)
    .max(3600) // 1 hour max
    .optional()
});

/**
 * API Key creation validation schema
 * Based on backend createApiKey patterns
 */
export const createApiKeySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'API key name must be at least 3 characters',
      'string.max': 'API key name cannot exceed 50 characters',
      'any.required': 'API key name is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
  
  permissions: Joi.array()
    .items(Joi.string().valid(
      'read', 'write', 'delete',
      'products:read', 'products:write', 'products:delete',
      'analytics:read', 'certificates:read', 'certificates:write',
      'votes:read', 'votes:write', 'nfts:read', 'nfts:write'
    ))
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one permission is required',
      'array.max': 'Maximum 10 permissions allowed',
      'any.required': 'Permissions are required'
    }),
  
  expiresAt: commonSchemas.futureDate.optional(),
  
  rateLimits: Joi.object({
    requestsPerMinute: Joi.number()
      .integer()
      .min(1)
      .max(10000)
      .default(100),
    requestsPerDay: Joi.number()
      .integer()
      .min(1)
      .max(1000000)
      .default(1000)
  }).default({
    requestsPerMinute: 100,
    requestsPerDay: 1000
  }),
  
  allowedOrigins: Joi.array()
    .items(Joi.alternatives().try(
      commonSchemas.url,
      Joi.string().ip()
    ))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 allowed origins'
    })
});

/**
 * Domain mapping creation validation schema
 * Based on backend domain validation patterns
 */
export const createDomainMappingSchema = Joi.object({
  domain: Joi.string()
    .domain()
    .required()
    .messages({
      'string.domain': 'Must be a valid domain name',
      'any.required': 'Domain is required'
    }),
  
  certificateType: Joi.string()
    .valid('letsencrypt', 'custom')
    .default('letsencrypt'),
  
  forceHttps: Joi.boolean().default(true),
  autoRenewal: Joi.boolean().default(true),
  
  customCertificate: Joi.when('certificateType', {
    is: 'custom',
    then: Joi.object({
      certificate: Joi.string().required(),
      privateKey: Joi.string().required(),
      chainCertificate: Joi.string().optional()
    }).required(),
    otherwise: Joi.optional()
  })
});

/**
 * Collection creation validation schema
 * Based on backend collection patterns
 */
export const createCollectionSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Collection title must be at least 2 characters',
      'string.max': 'Collection title cannot exceed 100 characters',
      'any.required': 'Collection title is required'
    }),
  
  description: commonSchemas.optionalLongText,
  
  products: Joi.array()
    .items(commonSchemas.mongoId)
    .min(0)
    .max(1000)
    .default([])
    .messages({
      'array.max': 'Collection cannot have more than 1000 products'
    }),
  
  slug: Joi.string()
    .alphanum()
    .lowercase()
    .min(2)
    .max(100)
    .optional(),
  
  isPublic: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
  featuredImage: commonSchemas.optionalUrl,
  
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 20 tags'
    }),
  
  sortOrder: Joi.number()
    .integer()
    .min(0)
    .default(0),
  
  metaDescription: Joi.string()
    .max(160)
    .optional()
    .messages({
      'string.max': 'Meta description cannot exceed 160 characters'
    }),
  
  metaKeywords: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 meta keywords'
    })
});

/**
 * Export all brand validation schemas for easy importing
 */
export const brandValidationSchemas = {
  updateBrandSettings: updateBrandSettingsSchema,
  emailGatingConfig: emailGatingConfigSchema,
  web3Settings: web3SettingsSchema,
  createApiKey: createApiKeySchema,
  createDomainMapping: createDomainMappingSchema,
  createCollection: createCollectionSchema
};