// src/lib/types/domains.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Domain status types
 * Based on backend IDomainMapping model status field
 */
export type DomainStatus = 'pending_verification' | 'active' | 'error' | 'deleting';

/**
 * Certificate type types
 * Based on backend IDomainMapping model certificateType field
 */
export type CertificateType = 'letsencrypt' | 'custom';

/**
 * Verification method types
 * Based on backend IDomainMapping model verificationMethod field
 */
export type VerificationMethod = 'dns' | 'file' | 'email';

/**
 * SSL status types
 * Based on backend IDomainMapping model sslStatus field
 */
export type SslStatus = 'unknown' | 'active' | 'expired' | 'expiring_soon' | 'error';

/**
 * DNS record type types
 * Based on backend IDomainMapping model dnsRecords type field
 */
export type DnsRecordType = 'CNAME' | 'A' | 'TXT';

/**
 * Certificate info interface
 * Based on backend IDomainMapping model certificateInfo field
 */
export interface CertificateInfo {
  issuer: string;
  validFrom: Date;
  validTo: Date;
  fingerprint?: string;
  serialNumber?: string;
}

/**
 * Custom certificate interface
 * Based on backend IDomainMapping model customCertificate field
 */
export interface CustomCertificate {
  certificate: string;
  privateKey: string;
  chainCertificate?: string;
  uploadedAt: Date;
  uploadedBy: string; // User ID reference
}

/**
 * DNS record interface
 * Based on backend IDomainMapping model dnsRecords field
 */
export interface DnsRecord {
  type: DnsRecordType;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

/**
 * Domain mapping interface
 * Based on backend IDomainMapping model
 */
export interface DomainMapping {
  _id: string;
  business: string; // Business ID reference
  hostname: string; // Legacy field for backward compatibility
  domain: string; // Primary domain field
  
  // Status and configuration
  status: DomainStatus;
  certificateType: CertificateType;
  forceHttps: boolean;
  autoRenewal: boolean;
  
  // Enhanced verification fields
  isActive: boolean;
  isVerified: boolean;
  verificationMethod: VerificationMethod;
  verificationToken?: string;
  verifiedAt?: Date;
  verifiedBy?: string; // User ID reference
  
  // SSL configuration
  sslEnabled: boolean;
  sslExpiresAt?: Date;
  sslStatus: SslStatus;
  certificateExpiry?: Date;
  certificateInfo?: CertificateInfo;
  lastCertificateRenewal?: Date;
  renewedBy?: string; // User ID reference
  
  // Custom certificate data
  customCertificate?: CustomCertificate;
  
  // DNS and CNAME configuration
  cnameTarget: string;
  dnsRecords?: DnsRecord[];
  
  // Error tracking
  lastError?: string;
  errorCount: number;
  lastErrorAt?: Date;
  
  // Analytics and monitoring
  lastCheckedAt?: Date;
  uptimePercentage?: number;
  responseTime?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain creation request
 * For creating new domain mappings
 */
export interface CreateDomainRequest {
  domain: string;
  certificateType: CertificateType;
  forceHttps?: boolean;
  autoRenewal?: boolean;
  verificationMethod?: VerificationMethod;
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
  };
}

/**
 * Domain update request
 * For updating existing domain mappings
 */
export interface UpdateDomainRequest {
  certificateType?: CertificateType;
  forceHttps?: boolean;
  autoRenewal?: boolean;
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
  };
}

/**
 * Domain verification request
 * For verifying domain ownership
 */
export interface VerifyDomainRequest {
  verificationMethod: VerificationMethod;
  verificationToken?: string;
}

/**
 * Domain list response
 * For paginated domain lists
 */
export interface DomainListResponse extends PaginatedResponse<DomainMapping> {
  domains: DomainMapping[];
  analytics: {
    totalDomains: number;
    activeDomains: number;
    pendingDomains: number;
    errorDomains: number;
    sslEnabledDomains: number;
    averageUptime: number;
  };
}

/**
 * Domain detail response
 * For detailed domain information
 */
export interface DomainDetailResponse {
  domain: DomainMapping;
  business: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  verificationStatus: {
    isVerified: boolean;
    verificationMethod: VerificationMethod;
    verificationToken?: string;
    verifiedAt?: Date;
    nextCheckAt?: Date;
  };
  sslStatus: {
    enabled: boolean;
    status: SslStatus;
    expiresAt?: Date;
    certificateInfo?: CertificateInfo;
    lastRenewal?: Date;
  };
  dnsStatus: {
    records: DnsRecord[];
    cnameTarget: string;
    lastChecked: Date;
    isValid: boolean;
  };
  monitoring: {
    uptimePercentage: number;
    responseTime: number;
    lastChecked: Date;
    errorCount: number;
    lastError?: string;
  };
}

/**
 * Domain analytics response
 * For domain analytics and reporting
 */
export interface DomainAnalyticsResponse {
  overview: {
    totalDomains: number;
    activeDomains: number;
    pendingDomains: number;
    errorDomains: number;
    sslEnabledDomains: number;
    averageUptime: number;
    averageResponseTime: number;
  };
  statusDistribution: Array<{
    status: DomainStatus;
    count: number;
    percentage: number;
  }>;
  sslStatusDistribution: Array<{
    status: SslStatus;
    count: number;
    percentage: number;
  }>;
  certificateTypeDistribution: Array<{
    type: CertificateType;
    count: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    domainsAdded: number;
    domainsVerified: number;
    sslRenewals: number;
    errors: number;
  }>;
  topDomains: Array<{
    domain: DomainMapping;
    metrics: {
      uptime: number;
      responseTime: number;
      errorCount: number;
    };
  }>;
}

/**
 * Domain verification response
 * For domain verification results
 */
export interface DomainVerificationResponse {
  success: boolean;
  domain: string;
  verificationMethod: VerificationMethod;
  verifiedAt: Date;
  nextSteps: string[];
  dnsRecords?: DnsRecord[];
  verificationToken?: string;
}

/**
 * SSL renewal response
 * For SSL certificate renewal
 */
export interface SslRenewalResponse {
  success: boolean;
  domain: string;
  renewedAt: Date;
  expiresAt: Date;
  certificateInfo: CertificateInfo;
  nextRenewalDate: Date;
}

/**
 * Domain health check response
 * For domain health monitoring
 */
export interface DomainHealthCheckResponse {
  domain: string;
  isHealthy: boolean;
  uptime: number;
  responseTime: number;
  sslStatus: SslStatus;
  dnsStatus: 'valid' | 'invalid' | 'pending';
  lastChecked: Date;
  issues: Array<{
    type: 'ssl' | 'dns' | 'uptime' | 'response_time';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Domain settings interface
 * For domain management settings
 */
export interface DomainSettings {
  defaultCertificateType: CertificateType;
  autoRenewal: boolean;
  forceHttps: boolean;
  monitoringEnabled: boolean;
  uptimeThreshold: number;
  responseTimeThreshold: number;
  notificationSettings: {
    sslExpiry: boolean;
    domainErrors: boolean;
    uptimeIssues: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Domain status validation schema
 */
export const domainStatusSchema = Joi.string()
  .valid('pending_verification', 'active', 'error', 'deleting')
  .required()
  .messages({
    'any.only': 'Status must be one of: pending_verification, active, error, deleting'
  });

/**
 * Certificate type validation schema
 */
export const certificateTypeSchema = Joi.string()
  .valid('letsencrypt', 'custom')
  .required()
  .messages({
    'any.only': 'Certificate type must be one of: letsencrypt, custom'
  });

/**
 * Verification method validation schema
 */
export const verificationMethodSchema = Joi.string()
  .valid('dns', 'file', 'email')
  .required()
  .messages({
    'any.only': 'Verification method must be one of: dns, file, email'
  });

/**
 * SSL status validation schema
 */
export const sslStatusSchema = Joi.string()
  .valid('unknown', 'active', 'expired', 'expiring_soon', 'error')
  .default('unknown')
  .messages({
    'any.only': 'SSL status must be one of: unknown, active, expired, expiring_soon, error'
  });

/**
 * DNS record type validation schema
 */
export const dnsRecordTypeSchema = Joi.string()
  .valid('CNAME', 'A', 'TXT')
  .required()
  .messages({
    'any.only': 'DNS record type must be one of: CNAME, A, TXT'
  });

/**
 * Certificate info validation schema
 */
export const certificateInfoSchema = Joi.object({
  issuer: Joi.string().required(),
  validFrom: Joi.date().required(),
  validTo: Joi.date().required(),
  fingerprint: Joi.string().optional(),
  serialNumber: Joi.string().optional()
});

/**
 * Custom certificate validation schema
 */
export const customCertificateSchema = Joi.object({
  certificate: Joi.string().required(),
  privateKey: Joi.string().required(),
  chainCertificate: Joi.string().optional()
});

/**
 * DNS record validation schema
 */
export const dnsRecordSchema = Joi.object({
  type: dnsRecordTypeSchema.required(),
  name: Joi.string().required(),
  value: Joi.string().required(),
  ttl: Joi.number().min(60).max(86400).optional(),
  priority: Joi.number().min(0).max(65535).optional()
});

/**
 * Create domain request validation schema
 */
export const createDomainRequestSchema = Joi.object({
  domain: Joi.string().hostname().required(),
  certificateType: certificateTypeSchema.required(),
  forceHttps: Joi.boolean().default(true),
  autoRenewal: Joi.boolean().default(true),
  verificationMethod: verificationMethodSchema.optional(),
  customCertificate: customCertificateSchema.optional()
});

/**
 * Update domain request validation schema
 */
export const updateDomainRequestSchema = Joi.object({
  certificateType: certificateTypeSchema.optional(),
  forceHttps: Joi.boolean().optional(),
  autoRenewal: Joi.boolean().optional(),
  customCertificate: customCertificateSchema.optional()
});

/**
 * Verify domain request validation schema
 */
export const verifyDomainRequestSchema = Joi.object({
  verificationMethod: verificationMethodSchema.required(),
  verificationToken: Joi.string().optional()
});

/**
 * Domain query validation schema
 */
export const domainQuerySchema = Joi.object({
  business: commonSchemas.mongoId.optional(),
  status: domainStatusSchema.optional(),
  certificateType: certificateTypeSchema.optional(),
  sslStatus: sslStatusSchema.optional(),
  isActive: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'domain', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Domain settings validation schema
 */
export const domainSettingsSchema = Joi.object({
  defaultCertificateType: certificateTypeSchema.required(),
  autoRenewal: Joi.boolean().default(true),
  forceHttps: Joi.boolean().default(true),
  monitoringEnabled: Joi.boolean().default(true),
  uptimeThreshold: Joi.number().min(0).max(100).default(99),
  responseTimeThreshold: Joi.number().min(0).max(10000).default(2000),
  notificationSettings: Joi.object({
    sslExpiry: Joi.boolean().default(true),
    domainErrors: Joi.boolean().default(true),
    uptimeIssues: Joi.boolean().default(true),
    emailNotifications: Joi.boolean().default(true),
    inAppNotifications: Joi.boolean().default(true)
  }).required()
});

/**
 * Export all domain validation schemas
 */
export const domainValidationSchemas = {
  domainStatus: domainStatusSchema,
  certificateType: certificateTypeSchema,
  verificationMethod: verificationMethodSchema,
  sslStatus: sslStatusSchema,
  dnsRecordType: dnsRecordTypeSchema,
  certificateInfo: certificateInfoSchema,
  customCertificate: customCertificateSchema,
  dnsRecord: dnsRecordSchema,
  createDomainRequest: createDomainRequestSchema,
  updateDomainRequest: updateDomainRequestSchema,
  verifyDomainRequest: verifyDomainRequestSchema,
  domainQuery: domainQuerySchema,
  domainSettings: domainSettingsSchema
};
