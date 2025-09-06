// src/lib/types/customer.ts

import Joi from 'joi';

/**
 * Represents an allowed customer for a specific brand.
 * This type is based on the IAllowedCustomer interface from the backend.
 */
export interface AllowedCustomer {
    _id: string;
    business: string; // Business ID reference
    email: string;
    findByEmail: string; // Backend field for searching
    
    // Customer metadata
    firstName?: string;
    lastName?: string;
    fullName?: string; // Virtual property from backend
    phone?: string; // Optional, aligned with registerUserSchema
    customerSource: 'manual' | 'shopify' | 'woocommerce' | 'csv_import' | 'api_import';
    externalCustomerId?: string; // Shopify customer ID, WooCommerce ID, etc.
    
    // Import tracking
    importBatch?: string; 
    importedAt?: string;
    importedBy?: string; 
    
    // Access control
    isActive: boolean;
    hasAccess: boolean;
    accessRevokedAt?: string; 
    accessRevokedBy?: string; 
    accessRevokedReason?: string; 
    
    // Customer behavior
    lastVotingAccess?: string;
    totalVotingAccesses: number;
    totalVotes: number;
    registeredAt?: string; 
    
    // Customer preferences
    tags: string[];
    notes?: string;
    vipStatus: boolean;
    
    // Sync status for integrations
    syncStatus: 'synced' | 'pending' | 'failed' | 'manual';
    lastSyncAt?: string;
    syncError?: string; 
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
  }
  
  /**
   * Customer summary interface used in email gating service responses
   */
  export interface CustomerSummary {
    id: string;
    email: string;
    fullName: string;
    customerSource: string;
    isActive: boolean;
    hasAccess: boolean;
    totalVotes: number;
    lastVotingAccess?: string;
    engagementLevel: 'none' | 'low' | 'medium' | 'high';
    vipStatus: boolean;
    tags: string[];
    createdAt: string;
  }
  
  /**
   * Data required to create a new allowed customer.
   */
  export interface CreateCustomerData {
    email: string;
    firstName?: string;
    lastName?: string;
    customerSource: 'manual' | 'api_import'; // Typically only these two for manual creation
    externalCustomerId?: string;
    tags?: string[];
    vipStatus?: boolean;
  }

  /**
 * Data for updating an existing allowed customer.
 * Partial fields for PATCH-style updates, aligned with backend update schemas.
 */
  export interface UpdateCustomerData {
    firstName?: string;
    lastName?: string;
    phone?: string; // Optional update, international format
    tags?: string[];
    vipStatus?: boolean;
    isActive?: boolean;
    hasAccess?: boolean;
    accessRevokedReason?: string; // If revoking access
    notes?: string;
  }
  
  /**
   * Customer import data interface for bulk operations
   */
  export interface CustomerImportData {
    email: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
    tags?: string[];
    vipStatus?: boolean;
  }
  
  /**
   * Customer filters interface
   */
  export interface CustomerFilters {
    search?: string;
    source?: string;
    tags?: string[];
    vipOnly?: boolean;
    activeOnly?: boolean;
    sortBy?: 'email' | 'fullName' | 'createdAt' | 'lastVotingAccess';
    sortOrder?: 'asc' | 'desc';
  }
  
  /**
   * Bulk import result interface
   */
  export interface BulkImportResult {
    imported: number;
    errors: string[];
    batchId?: string;
    duplicates?: number;
    updated?: number;
  }
  
  /**
   * CSV import interface
   */
  export interface CSVImportData {
    csvData: string;
    source: 'csv_import';
    validateOnly?: boolean;
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  }
  
  /**
   * Shopify sync result interface
   */
  export interface ShopifySyncResult {
    synced: number;
    errors: string[];
    lastSyncAt: string;
  }
  
  /**
   * Email gating check result
   */
  export interface EmailGatingResult {
    allowed: boolean;
    reason?: string;
    customer?: CustomerSummary;
    settings?: {
      enabled: boolean;
      mode: 'whitelist' | 'blacklist' | 'disabled';
      allowUnregistered: boolean;
      accessDeniedMessage?: string;
    };
  }
  
  /**
   * Customer voting access grant result
   */
  export interface VotingAccessResult {
    granted: boolean;
    customer?: CustomerSummary;
    message: string;
  }
  
  /**
   * Customer stats interface for dashboard
   */
  export interface CustomerStats {
    total: number;
    active: number;
    registered: number;
    totalVotes: number;
    vipCustomers: number;
    bySource: Record<string, {
      total: number;
      active: number;
    }>;
    recentActivity: {
      newCustomersToday: number;
      newCustomersThisWeek: number;
      votesToday: number;
      votesThisWeek: number;
    };
  }
  
  /**
   * Email validation result
   */
  export interface EmailValidationResult {
    valid: boolean;
    email: string;
    issues?: string[];
    suggestions?: string;
  }
  
  /**
   * Customer export options
   */
  export interface CustomerExportOptions {
    format: 'csv' | 'xlsx' | 'json';
    filters?: CustomerFilters;
    includeInactive?: boolean;
    includeVotingHistory?: boolean;
    fields?: string[];
  }
  
  /**
   * Paginated customer list response
   * Extends common PaginatedResponse for customer lists
   */
  export interface CustomerListResponse<T = AllowedCustomer> {
    docs: T[]; // Main data array
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
    // Additional metadata
    hasMore?: boolean;
    offset?: number;
  }
  
  /**
   * Simple paginated customer response
   * Extends common SimplePaginatedResponse for simpler customer lists
   */
  export interface SimpleCustomerListResponse<T = AllowedCustomer> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }
  
  /**
   * Type guards for customer interfaces
   */
  export function isAllowedCustomer(obj: any): obj is AllowedCustomer {
    return obj && typeof obj._id === 'string' && typeof obj.email === 'string' && typeof obj.business === 'string';
  }
  
  export function isCustomerSummary(obj: any): obj is CustomerSummary {
    return obj && typeof obj.id === 'string' && typeof obj.email === 'string' && typeof obj.fullName === 'string';
  }
  
  // Joi validation schemas aligned with backend patterns
  
  /**
   * Common validation patterns matching backend
   */
  const commonPatterns = {
    mongoId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Must be a valid MongoDB ObjectId'
      }),
    
    email: Joi.string()
      .email()
      .lowercase()
      .custom((value, helpers) => {
        // Check against disposable email domains (matching backend logic)
        const disposableDomains = [
          '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
          'mailinator.com', 'yopmail.com', 'temp-mail.org', 'guerrillamailblock.com',
          'sharklasers.com', 'grr.la', 'guerrillamail.info', 'guerrillamail.biz',
          'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org'
        ];
        
        const domain = value.split('@')[1]?.toLowerCase();
        if (disposableDomains.includes(domain)) {
          return helpers.error('email.disposable');
        }
        return value;
      })
      .messages({
        'string.email': 'Must be a valid email address',
        'email.disposable': 'Disposable email addresses are not allowed'
      }),
    
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters',
        'string.pattern.base': 'Name can only contain letters, spaces, apostrophes, and hyphens'
      }),
    
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.pattern.base': 'Must be a valid phone number in international format'
      }),
    
    tags: Joi.array()
      .items(Joi.string().trim().min(1).max(50))
      .max(20)
      .messages({
        'array.max': 'Cannot have more than 20 tags',
        'string.max': 'Each tag cannot exceed 50 characters'
      })
  };
  
  /**
   * Joi schema for validating customer email
   * Mirrors backend registerUserSchema email rules: valid email, lowercase, no disposable domains
   */
  export const customerEmailSchema = commonPatterns.email.required()
    .messages({
      'any.required': 'Email is required'
    });
  
  /**
   * Joi schema for CreateCustomerData
   * Enforces email constraints client-side, aligned with backend validation
   */
  export const createCustomerSchema = Joi.object({
    email: customerEmailSchema,
    
    firstName: commonPatterns.name.optional(),
    
    lastName: commonPatterns.name.optional(),
    
    customerSource: Joi.string()
      .valid('manual', 'api_import')
      .required()
      .messages({
        'any.only': 'Customer source must be either "manual" or "api_import"',
        'any.required': 'Customer source is required'
      }),
    
    externalCustomerId: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'External customer ID cannot exceed 100 characters'
      }),
    
    tags: commonPatterns.tags.optional(),
    
    vipStatus: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'VIP status must be a boolean value'
      })
  });
  
  /**
   * Joi schema for UpdateCustomerData
   * Partial updates with proper validation
   */
  export const updateCustomerSchema = Joi.object({
    firstName: commonPatterns.name.optional(),
    
    lastName: commonPatterns.name.optional(),
    
    phone: commonPatterns.phone.optional(),
    
    tags: commonPatterns.tags.optional(),
    
    vipStatus: Joi.boolean().optional(),
    
    isActive: Joi.boolean().optional(),
    
    hasAccess: Joi.boolean().optional(),
    
    accessRevokedReason: Joi.string()
      .trim()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Access revoked reason cannot exceed 500 characters'
      }),
    
    notes: Joi.string()
      .trim()
      .max(1000)
      .optional()
      .messages({
        'string.max': 'Notes cannot exceed 1000 characters'
      })
  });
  
  /**
   * Joi schema for CustomerImportData (bulk)
   * Enforces email constraints per item
   */
  export const customerImportSchema = Joi.object({
    email: customerEmailSchema,
    
    firstName: commonPatterns.name.optional(),
    
    lastName: commonPatterns.name.optional(),
    
    externalCustomerId: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'External customer ID cannot exceed 100 characters'
      }),
    
    tags: commonPatterns.tags.optional(),
    
    vipStatus: Joi.boolean()
      .default(false)
      .optional()
  });
  
  /**
   * Joi schema for bulk import operations
   */
  export const bulkImportCustomersSchema = Joi.object({
    customers: Joi.array()
      .items(customerImportSchema)
      .min(1)
      .max(1000)
      .required()
      .messages({
        'array.min': 'At least one customer is required for import',
        'array.max': 'Cannot import more than 1000 customers at once',
        'any.required': 'Customers array is required'
      }),
    
    validateOnly: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Validate only must be a boolean value'
      }),
    
    skipDuplicates: Joi.boolean()
      .default(true)
      .messages({
        'boolean.base': 'Skip duplicates must be a boolean value'
      }),
    
    updateExisting: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Update existing must be a boolean value'
      }),
    
    importSource: Joi.string()
      .valid('csv_import', 'api_import', 'shopify', 'woocommerce')
      .default('csv_import')
      .optional()
  });
  
  /**
   * Joi schema for CSV import data
   */
  export const csvImportSchema = Joi.object({
    csvData: Joi.string()
      .trim()
      .min(1)
      .required()
      .messages({
        'string.min': 'CSV data cannot be empty',
        'any.required': 'CSV data is required'
      }),
    
    source: Joi.string()
      .valid('csv_import')
      .default('csv_import')
      .messages({
        'any.only': 'Source must be "csv_import"'
      }),
    
    validateOnly: Joi.boolean().default(false),
    skipDuplicates: Joi.boolean().default(true),
    updateExisting: Joi.boolean().default(false)
  });
  
  /**
   * Joi schema for customer filters
   */
  export const customerFiltersSchema = Joi.object({
    search: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Search term must be at least 2 characters',
        'string.max': 'Search term cannot exceed 100 characters'
      }),
    
    source: Joi.string()
      .valid('manual', 'shopify', 'woocommerce', 'csv_import', 'api_import')
      .optional(),
    
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot filter by more than 10 tags'
      }),
    
    vipOnly: Joi.boolean().optional(),
    
    activeOnly: Joi.boolean().optional(),
    
    sortBy: Joi.string()
      .valid('email', 'fullName', 'createdAt', 'lastVotingAccess', 'totalVotes')
      .default('createdAt')
      .optional(),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .optional(),
    
    // Pagination
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional()
  });
  
  /**
   * Joi schema for customer export options
   */
  export const customerExportSchema = Joi.object({
    format: Joi.string()
      .valid('csv', 'xlsx', 'json')
      .required()
      .messages({
        'any.only': 'Format must be one of: csv, xlsx, json',
        'any.required': 'Export format is required'
      }),
    
    filters: customerFiltersSchema.optional(),
    
    includeInactive: Joi.boolean().default(false),
    
    includeVotingHistory: Joi.boolean().default(false),
    
    fields: Joi.array()
      .items(Joi.string().valid(
        'email', 'firstName', 'lastName', 'fullName', 'phone',
        'customerSource', 'externalCustomerId', 'isActive', 'hasAccess',
        'totalVotes', 'vipStatus', 'tags', 'notes', 'createdAt', 'updatedAt'
      ))
      .max(20)
      .optional()
      .messages({
        'array.max': 'Cannot select more than 20 fields for export'
      })
  });
  
  /**
   * Joi schema for email gating check
   */
  export const emailGatingCheckSchema = Joi.object({
    email: customerEmailSchema,
    
    businessId: commonPatterns.mongoId.required(),
    
    proposalId: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Proposal ID cannot exceed 100 characters'
      }),
    
    checkOnly: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Check only must be a boolean value'
      })
  });
  
  /**
   * Joi schema for granting voting access
   */
  export const grantVotingAccessSchema = Joi.object({
    email: customerEmailSchema,
    
    businessId: commonPatterns.mongoId.required(),
    
    grantReason: Joi.string()
      .trim()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Grant reason cannot exceed 500 characters'
      }),
    
    vipStatus: Joi.boolean().default(false),
    
    tags: commonPatterns.tags.optional()
  });