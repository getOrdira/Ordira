// src/lib/types/customer.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';

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
    
    // Import tracking (missing from original)
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
  
// ===== JOI VALIDATION SCHEMAS =====
// Aligned with backend customer validation patterns

/**
 * Customer email validation schema
 * Mirrors backend registerUserSchema email rules: valid email, lowercase, no disposable domains
 */
export const customerEmailSchema = commonSchemas.businessEmail; // Reuse business email validation (blocks disposable)

/**
 * Create customer validation schema
 * Enforces email constraints and required fields
 */
export const createCustomerSchema = Joi.object<CreateCustomerData>({
  email: customerEmailSchema,
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
  customerSource: Joi.string()
    .valid('manual', 'api_import')
    .required()
    .messages({
      'any.only': 'Customer source must be manual or api_import',
      'any.required': 'Customer source is required'
    }),
  externalCustomerId: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'External customer ID cannot exceed 100 characters'
    }),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    }),
  vipStatus: Joi.boolean().default(false)
});

/**
 * Update customer validation schema
 * All fields optional for PATCH-style updates
 */
export const updateCustomerSchema = Joi.object<UpdateCustomerData>({
  firstName: createCustomerSchema.extract('firstName'),
  lastName: createCustomerSchema.extract('lastName'),
  phone: commonSchemas.optionalPhone,
  tags: createCustomerSchema.extract('tags'),
  vipStatus: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  hasAccess: Joi.boolean().optional(),
  accessRevokedReason: Joi.string()
    .trim()
    .max(200)
    .when('hasAccess', {
      is: false,
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'string.max': 'Access revocation reason cannot exceed 200 characters',
      'any.forbidden': 'Access revocation reason can only be set when revoking access'
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
 * Customer import data validation schema
 * For individual items in bulk imports
 */
export const customerImportSchema = Joi.object<CustomerImportData>({
  email: customerEmailSchema,
  firstName: createCustomerSchema.extract('firstName'),
  lastName: createCustomerSchema.extract('lastName'),
  externalCustomerId: createCustomerSchema.extract('externalCustomerId'),
  tags: createCustomerSchema.extract('tags'),
  vipStatus: createCustomerSchema.extract('vipStatus')
});

/**
 * Customer filters validation schema
 * For search and filtering operations
 */
export const customerFiltersSchema = Joi.object<CustomerFilters>({
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
    .optional()
    .messages({
      'any.only': 'Source must be manual, shopify, woocommerce, csv_import, or api_import'
    }),
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
    .valid('email', 'fullName', 'createdAt', 'lastVotingAccess')
    .default('createdAt')
    .optional(),
  sortOrder: commonSchemas.sortOrder
});

/**
 * CSV import data validation schema
 * For bulk CSV imports
 */
export const csvImportSchema = Joi.object<CSVImportData>({
  csvData: Joi.string()
    .required()
    .messages({
      'any.required': 'CSV data is required'
    }),
  source: Joi.string()
    .valid('csv_import')
    .required(),
  validateOnly: Joi.boolean().default(false),
  skipDuplicates: Joi.boolean().default(true),
  updateExisting: Joi.boolean().default(false)
});

/**
 * Bulk customer import validation schema
 * For API bulk imports
 */
export const bulkImportCustomersSchema = Joi.object({
  customers: Joi.array()
    .items(customerImportSchema)
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.min': 'At least one customer is required',
      'array.max': 'Cannot import more than 1000 customers at once',
      'any.required': 'Customers array is required'
    }),
  source: Joi.string()
    .valid('api_import', 'csv_import')
    .default('api_import'),
  skipDuplicates: Joi.boolean().default(true),
  updateExisting: Joi.boolean().default(false),
  batchSize: Joi.number()
    .integer()
    .min(10)
    .max(100)
    .default(50)
    .optional()
    .messages({
      'number.min': 'Batch size must be at least 10',
      'number.max': 'Batch size cannot exceed 100'
    })
});

/**
 * Customer export options validation schema
 */
export const customerExportSchema = Joi.object<CustomerExportOptions>({
  format: Joi.string()
    .valid('csv', 'xlsx', 'json')
    .default('csv')
    .messages({
      'any.only': 'Format must be csv, xlsx, or json'
    }),
  filters: customerFiltersSchema.optional(),
  includeInactive: Joi.boolean().default(false),
  includeVotingHistory: Joi.boolean().default(false),
  fields: Joi.array()
    .items(Joi.string().valid(
      'email', 'firstName', 'lastName', 'fullName', 'phone', 'customerSource',
      'externalCustomerId', 'isActive', 'hasAccess', 'totalVotes', 
      'lastVotingAccess', 'tags', 'vipStatus', 'createdAt', 'updatedAt'
    ))
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one field must be selected for export'
    })
});

/**
 * Email gating check validation schema
 * For validating email access requests
 */
export const emailGatingCheckSchema = Joi.object({
  email: customerEmailSchema,
  businessId: commonSchemas.mongoId.required(),
  source: Joi.string()
    .valid('web', 'mobile', 'api', 'widget')
    .default('web')
    .optional(),
  metadata: Joi.object({
    userAgent: Joi.string().max(500).optional(),
    ipAddress: Joi.string().ip().optional(),
    referrer: commonSchemas.optionalUrl
  }).optional()
});

/**
 * Export all customer validation schemas for easy importing
 */
export const customerValidationSchemas = {
  customerEmail: customerEmailSchema,
  createCustomer: createCustomerSchema,
  updateCustomer: updateCustomerSchema,
  customerImport: customerImportSchema,
  customerFilters: customerFiltersSchema,
  csvImport: csvImportSchema,
  bulkImport: bulkImportCustomersSchema,
  customerExport: customerExportSchema,
  emailGatingCheck: emailGatingCheckSchema
};