// src/lib/types/allowed-customers.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Customer source types
 * Based on backend IAllowedCustomer model customerSource field
 */
export type CustomerSource = 'manual' | 'shopify' | 'woocommerce' | 'csv_import' | 'api_import';

/**
 * Engagement level types
 * Based on backend IAllowedCustomer model engagementLevel field
 */
export type EngagementLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Sync status types
 * Based on backend IAllowedCustomer model syncStatus field
 */
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'manual';

/**
 * Allowed customer interface
 * Based on backend IAllowedCustomer model
 */
export interface AllowedCustomer {
  _id: string;
  business: string; // Business ID reference
  email: string;
  findByEmail: string;
  
  // Customer metadata
  firstName?: string;
  lastName?: string;
  fullName: string;
  customerSource: CustomerSource;
  externalCustomerId?: string;
  engagementLevel: EngagementLevel;
  
  // Import tracking
  importBatch?: string;
  importedAt?: Date;
  importedBy?: string; // User ID reference
  
  // Access control
  isActive: boolean;
  hasAccess: boolean;
  accessRevokedAt?: Date;
  accessRevokedBy?: string; // User ID reference
  accessRevokedReason?: string;
  
  // Customer behavior
  lastVotingAccess?: Date;
  totalVotingAccesses: number;
  totalVotes: number;
  registeredAt?: Date;
  daysSinceLastAccess: number | null;
  
  // Customer preferences
  tags: string[];
  notes?: string;
  vipStatus: boolean;
  
  // Sync status for integrations
  syncStatus: SyncStatus;
  lastSyncAt?: Date;
  syncError?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Allowed customer creation request
 * For creating new allowed customers
 */
export interface CreateAllowedCustomerRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  customerSource: CustomerSource;
  externalCustomerId?: string;
  tags?: string[];
  notes?: string;
  vipStatus?: boolean;
  importBatch?: string;
}

/**
 * Allowed customer update request
 * For updating existing allowed customers
 */
export interface UpdateAllowedCustomerRequest {
  firstName?: string;
  lastName?: string;
  engagementLevel?: EngagementLevel;
  tags?: string[];
  notes?: string;
  vipStatus?: boolean;
  isActive?: boolean;
  hasAccess?: boolean;
}

/**
 * Allowed customer list response
 * For paginated allowed customer lists
 */
export interface AllowedCustomerListResponse extends PaginatedResponse<AllowedCustomer> {
  customers: AllowedCustomer[];
  analytics: {
    totalCustomers: number;
    activeCustomers: number;
    vipCustomers: number;
    customersBySource: Array<{
      source: CustomerSource;
      count: number;
    }>;
    customersByEngagement: Array<{
      level: EngagementLevel;
      count: number;
    }>;
    averageVotesPerCustomer: number;
  };
}

/**
 * Allowed customer detail response
 * For detailed allowed customer information
 */
export interface AllowedCustomerDetailResponse {
  customer: AllowedCustomer;
  business: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  votingHistory: Array<{
    voteId: string;
    productId: string;
    productName: string;
    timestamp: Date;
    source: string;
  }>;
  accessHistory: Array<{
    action: 'granted' | 'revoked' | 'restored';
    timestamp: Date;
    reason?: string;
    performedBy: string;
  }>;
  syncHistory: Array<{
    status: SyncStatus;
    timestamp: Date;
    error?: string;
    source: CustomerSource;
  }>;
}

/**
 * Allowed customer analytics response
 * For allowed customer analytics and reporting
 */
export interface AllowedCustomerAnalyticsResponse {
  overview: {
    totalCustomers: number;
    activeCustomers: number;
    vipCustomers: number;
    averageEngagement: number;
    totalVotes: number;
    averageVotesPerCustomer: number;
  };
  sourceDistribution: Array<{
    source: CustomerSource;
    count: number;
    percentage: number;
    averageEngagement: number;
  }>;
  engagementDistribution: Array<{
    level: EngagementLevel;
    count: number;
    percentage: number;
  }>;
  vipAnalysis: {
    vipCustomers: number;
    vipEngagement: number;
    vipVoteRate: number;
    vipRetentionRate: number;
  };
  monthlyStats: Array<{
    month: string;
    newCustomers: number;
    activeCustomers: number;
    votes: number;
    engagement: number;
  }>;
  topCustomers: Array<{
    customer: AllowedCustomer;
    metrics: {
      votes: number;
      engagement: number;
      lastAccess?: Date;
    };
  }>;
}

/**
 * Allowed customer search response
 * For allowed customer search results
 */
export interface AllowedCustomerSearchResponse extends PaginatedResponse<AllowedCustomer> {
  customers: AllowedCustomer[];
  filters: {
    sources: CustomerSource[];
    engagementLevels: EngagementLevel[];
    vipStatus: boolean[];
    accessStatus: boolean[];
    dateRange: {
      from: Date;
      to: Date;
    };
  };
  searchMetadata: {
    query?: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Allowed customer batch import request
 * For importing multiple allowed customers
 */
export interface BatchImportAllowedCustomersRequest {
  customers: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    customerSource: CustomerSource;
    externalCustomerId?: string;
    tags?: string[];
    notes?: string;
    vipStatus?: boolean;
  }>;
  importOptions: {
    source: CustomerSource;
    batchId: string;
    overwriteExisting?: boolean;
    sendWelcomeEmail?: boolean;
  };
}

/**
 * Allowed customer batch import response
 * For batch import results
 */
export interface BatchImportAllowedCustomersResponse {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    index: number;
    email: string;
    error: string;
  }>;
  results: Array<{
    index: number;
    email: string;
    customerId?: string;
    status: 'created' | 'updated' | 'failed' | 'skipped';
    message?: string;
  }>;
}

/**
 * Allowed customer access management request
 * For managing customer access
 */
export interface ManageCustomerAccessRequest {
  customerIds: string[];
  action: 'grant' | 'revoke' | 'restore';
  reason?: string;
  notifyCustomers?: boolean;
}

/**
 * Allowed customer settings interface
 * For allowed customer management settings
 */
export interface AllowedCustomerSettings {
  access: {
    defaultAccess: boolean;
    requireApproval: boolean;
    autoGrantAfterVote: boolean;
    vipAutoAccess: boolean;
  };
  imports: {
    allowedSources: CustomerSource[];
    autoSync: boolean;
    syncInterval: number; // in hours
    overwriteOnSync: boolean;
  };
  notifications: {
    newCustomerAdded: boolean;
    accessGranted: boolean;
    accessRevoked: boolean;
    vipStatusChanged: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
  analytics: {
    trackEngagement: boolean;
    trackVotingPatterns: boolean;
    retentionDays: number;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Customer source validation schema
 */
export const customerSourceSchema = Joi.string()
  .valid('manual', 'shopify', 'woocommerce', 'csv_import', 'api_import')
  .required()
  .messages({
    'any.only': 'Customer source must be one of: manual, shopify, woocommerce, csv_import, api_import'
  });

/**
 * Engagement level validation schema
 */
export const engagementLevelSchema = Joi.string()
  .valid('none', 'low', 'medium', 'high')
  .default('none')
  .messages({
    'any.only': 'Engagement level must be one of: none, low, medium, high'
  });

/**
 * Sync status validation schema
 */
export const syncStatusSchema = Joi.string()
  .valid('synced', 'pending', 'failed', 'manual')
  .default('manual')
  .messages({
    'any.only': 'Sync status must be one of: synced, pending, failed, manual'
  });

/**
 * Create allowed customer request validation schema
 */
export const createAllowedCustomerRequestSchema = Joi.object({
  email: commonSchemas.email.required(),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  customerSource: customerSourceSchema.required(),
  externalCustomerId: Joi.string().max(100).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  notes: Joi.string().max(1000).optional(),
  vipStatus: Joi.boolean().default(false),
  importBatch: Joi.string().max(100).optional()
});

/**
 * Update allowed customer request validation schema
 */
export const updateAllowedCustomerRequestSchema = Joi.object({
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  engagementLevel: engagementLevelSchema.optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  notes: Joi.string().max(1000).optional(),
  vipStatus: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  hasAccess: Joi.boolean().optional()
});

/**
 * Allowed customer query validation schema
 */
export const allowedCustomerQuerySchema = Joi.object({
  business: commonSchemas.mongoId.optional(),
  customerSource: customerSourceSchema.optional(),
  engagementLevel: engagementLevelSchema.optional(),
  vipStatus: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  hasAccess: Joi.boolean().optional(),
  syncStatus: syncStatusSchema.optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'fullName', 'email', 'engagementLevel', 'totalVotes').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Batch import allowed customers request validation schema
 */
export const batchImportAllowedCustomersRequestSchema = Joi.object({
  customers: Joi.array().items(
    Joi.object({
      email: commonSchemas.email.required(),
      firstName: Joi.string().max(100).optional(),
      lastName: Joi.string().max(100).optional(),
      customerSource: customerSourceSchema.required(),
      externalCustomerId: Joi.string().max(100).optional(),
      tags: Joi.array().items(Joi.string().max(50)).optional(),
      notes: Joi.string().max(1000).optional(),
      vipStatus: Joi.boolean().default(false)
    })
  ).min(1).max(1000).required(),
  importOptions: Joi.object({
    source: customerSourceSchema.required(),
    batchId: Joi.string().max(100).required(),
    overwriteExisting: Joi.boolean().default(false),
    sendWelcomeEmail: Joi.boolean().default(false)
  }).required()
});

/**
 * Manage customer access request validation schema
 */
export const manageCustomerAccessRequestSchema = Joi.object({
  customerIds: Joi.array().items(commonSchemas.mongoId).min(1).max(100).required(),
  action: Joi.string().valid('grant', 'revoke', 'restore').required(),
  reason: Joi.string().max(500).optional(),
  notifyCustomers: Joi.boolean().default(true)
});

/**
 * Allowed customer settings validation schema
 */
export const allowedCustomerSettingsSchema = Joi.object({
  access: Joi.object({
    defaultAccess: Joi.boolean().default(true),
    requireApproval: Joi.boolean().default(false),
    autoGrantAfterVote: Joi.boolean().default(true),
    vipAutoAccess: Joi.boolean().default(true)
  }).required(),
  imports: Joi.object({
    allowedSources: Joi.array().items(customerSourceSchema).required(),
    autoSync: Joi.boolean().default(false),
    syncInterval: Joi.number().min(1).max(168).default(24), // 1 hour to 1 week
    overwriteOnSync: Joi.boolean().default(false)
  }).required(),
  notifications: Joi.object({
    newCustomerAdded: Joi.boolean().default(true),
    accessGranted: Joi.boolean().default(true),
    accessRevoked: Joi.boolean().default(true),
    vipStatusChanged: Joi.boolean().default(true),
    emailNotifications: Joi.boolean().default(true),
    inAppNotifications: Joi.boolean().default(true)
  }).required(),
  analytics: Joi.object({
    trackEngagement: Joi.boolean().default(true),
    trackVotingPatterns: Joi.boolean().default(true),
    retentionDays: Joi.number().min(30).max(3650).default(365)
  }).required()
});

/**
 * Export all allowed customer validation schemas
 */
export const allowedCustomerValidationSchemas = {
  customerSource: customerSourceSchema,
  engagementLevel: engagementLevelSchema,
  syncStatus: syncStatusSchema,
  createAllowedCustomerRequest: createAllowedCustomerRequestSchema,
  updateAllowedCustomerRequest: updateAllowedCustomerRequestSchema,
  allowedCustomerQuery: allowedCustomerQuerySchema,
  batchImportAllowedCustomersRequest: batchImportAllowedCustomersRequestSchema,
  manageCustomerAccessRequest: manageCustomerAccessRequestSchema,
  allowedCustomerSettings: allowedCustomerSettingsSchema
};
