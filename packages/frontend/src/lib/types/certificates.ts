// src/lib/types/certificates.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Certificate status types
 * Based on backend ICertificate model status field
 */
export type CertificateStatus = 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed' | 'revoked';

/**
 * Certificate level types
 * Based on backend ICertificate model certificateLevel field
 */
export type CertificateLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Transfer priority types
 * Based on backend ICertificate model deliveryOptions priority field
 */
export type TransferPriority = 'standard' | 'priority' | 'urgent';

/**
 * Certificate attribute interface
 * Based on backend ICertificate model metadata attributes
 */
export interface CertificateAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

/**
 * Certificate metadata interface
 * Based on backend ICertificate model metadata field
 */
export interface CertificateMetadata {
  customMessage?: string;
  attributes?: CertificateAttribute[];
  expirationDate?: Date;
  certificateLevel?: CertificateLevel;
  imageUrl?: string;
  templateId?: string;
  metadataUri?: string;
  s3Keys?: {
    image?: string;
    metadata?: string;
  };
}

/**
 * Delivery options interface
 * Based on backend ICertificate model deliveryOptions field
 */
export interface DeliveryOptions {
  scheduleDate?: Date;
  priority?: TransferPriority;
  notifyRecipient?: boolean;
}

/**
 * Web3 options interface
 * Based on backend ICertificate model web3Options field
 */
export interface Web3Options {
  autoTransfer?: boolean;
  transferDelay?: number;
  brandWallet?: string;
  gasLimit?: number;
  maxGasPrice?: number;
}

/**
 * Transfer analytics interface
 * Based on backend ICertificate model transferAnalytics field
 */
export interface TransferAnalytics {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  averageTransferTime: number;
  totalGasUsed: string;
  monthlyStats: Array<{
    month: string;
    transfers: number;
    success: number;
    failures: number;
  }>;
}

/**
 * Certificate interface
 * Based on backend ICertificate model
 */
export interface Certificate {
  _id: string;
  business: string; // Business ID reference
  product: string; // Product ID reference
  recipient: string; // Customer email or contact
  tokenId: string;
  txHash: string;
  contractAddress?: string;
  
  // Enhanced transfer tracking fields
  status: CertificateStatus;
  imageUrl?: string;
  mintedToRelayer: boolean;
  transferredToBrand?: boolean;
  brandWallet?: string;
  transferTxHash?: string;
  transferredAt?: Date;
  transferFailed?: boolean;
  transferError?: string;
  transferAttempts: number;
  maxTransferAttempts: number;
  nextTransferAttempt?: Date;
  
  // Transfer automation settings
  autoTransferEnabled: boolean;
  transferDelayMinutes: number;
  transferTimeout: number;
  transferScheduled?: boolean;
  transferDelay?: number;
  gasUsed?: string;
  
  // Certificate metadata
  metadata?: CertificateMetadata;
  
  // Delivery and Web3 options
  deliveryOptions?: DeliveryOptions;
  web3Options?: Web3Options;
  
  // Analytics and tracking
  transferAnalytics?: TransferAnalytics;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Certificate creation request
 * For creating new certificates
 */
export interface CreateCertificateRequest {
  product: string;
  recipient: string;
  metadata?: CertificateMetadata;
  deliveryOptions?: DeliveryOptions;
  web3Options?: Web3Options;
  customMessage?: string;
  certificateLevel?: CertificateLevel;
  expirationDate?: Date;
}

/**
 * Certificate update request
 * For updating existing certificates
 */
export interface UpdateCertificateRequest {
  metadata?: CertificateMetadata;
  deliveryOptions?: DeliveryOptions;
  web3Options?: Web3Options;
  customMessage?: string;
  certificateLevel?: CertificateLevel;
  expirationDate?: Date;
}

/**
 * Certificate transfer request
 * For transferring certificates
 */
export interface TransferCertificateRequest {
  brandWallet: string;
  priority?: TransferPriority;
  gasLimit?: number;
  maxGasPrice?: number;
  scheduleDate?: Date;
}

/**
 * Certificate batch creation request
 * For creating multiple certificates
 */
export interface BatchCreateCertificateRequest {
  certificates: Array<{
    product: string;
    recipient: string;
    metadata?: CertificateMetadata;
    deliveryOptions?: DeliveryOptions;
    web3Options?: Web3Options;
  }>;
  batchOptions?: {
    priority?: TransferPriority;
    scheduleDate?: Date;
    notifyRecipients?: boolean;
  };
}

/**
 * Certificate list response
 * For paginated certificate lists
 */
export interface CertificateListResponse extends PaginatedResponse<Certificate> {
  certificates: Certificate[];
  analytics: {
    totalMinted: number;
    totalTransferred: number;
    totalFailed: number;
    averageTransferTime: number;
  };
}

/**
 * Certificate detail response
 * For detailed certificate information
 */
export interface CertificateDetailResponse {
  certificate: Certificate;
  product: {
    _id: string;
    title: string;
    description?: string;
    imageUrl?: string;
  };
  business: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  transferHistory: Array<{
    status: CertificateStatus;
    timestamp: Date;
    txHash?: string;
    error?: string;
    gasUsed?: string;
  }>;
}

/**
 * Certificate analytics response
 * For certificate analytics and reporting
 */
export interface CertificateAnalyticsResponse {
  overview: {
    totalMinted: number;
    totalTransferred: number;
    totalFailed: number;
    averageTransferTime: number;
    totalGasUsed: string;
  };
  monthlyStats: Array<{
    month: string;
    transfers: number;
    success: number;
    failures: number;
    gasUsed: string;
  }>;
  statusDistribution: Array<{
    status: CertificateStatus;
    count: number;
    percentage: number;
  }>;
  levelDistribution: Array<{
    level: CertificateLevel;
    count: number;
    percentage: number;
  }>;
}

/**
 * Certificate template interface
 * For certificate templates
 */
export interface CertificateTemplate {
  _id: string;
  name: string;
  description?: string;
  templateUrl: string;
  previewUrl?: string;
  isActive: boolean;
  certificateLevel: CertificateLevel;
  defaultAttributes: CertificateAttribute[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Certificate verification response
 * For verifying certificate authenticity
 */
export interface CertificateVerificationResponse {
  isValid: boolean;
  certificate: Certificate;
  verificationDetails: {
    contractAddress: string;
    tokenId: string;
    blockNumber: number;
    transactionHash: string;
    verifiedAt: Date;
  };
  metadata: CertificateMetadata;
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Certificate status validation schema
 */
export const certificateStatusSchema = Joi.string()
  .valid('minted', 'pending_transfer', 'transferred_to_brand', 'transfer_failed', 'revoked')
  .required()
  .messages({
    'any.only': 'Status must be one of: minted, pending_transfer, transferred_to_brand, transfer_failed, revoked'
  });

/**
 * Certificate level validation schema
 */
export const certificateLevelSchema = Joi.string()
  .valid('bronze', 'silver', 'gold', 'platinum')
  .optional()
  .messages({
    'any.only': 'Certificate level must be one of: bronze, silver, gold, platinum'
  });

/**
 * Certificate attribute validation schema
 */
export const certificateAttributeSchema = Joi.object({
  trait_type: Joi.string().required(),
  value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  display_type: Joi.string().optional()
});

/**
 * Certificate metadata validation schema
 */
export const certificateMetadataSchema = Joi.object({
  customMessage: Joi.string().max(500).optional(),
  attributes: Joi.array().items(certificateAttributeSchema).optional(),
  expirationDate: Joi.date().optional(),
  certificateLevel: certificateLevelSchema,
  imageUrl: commonSchemas.optionalUrl,
  templateId: Joi.string().optional(),
  metadataUri: commonSchemas.optionalUrl,
  s3Keys: Joi.object({
    image: Joi.string().optional(),
    metadata: Joi.string().optional()
  }).optional()
});

/**
 * Delivery options validation schema
 */
export const deliveryOptionsSchema = Joi.object({
  scheduleDate: Joi.date().optional(),
  priority: Joi.string().valid('standard', 'priority', 'urgent').optional(),
  notifyRecipient: Joi.boolean().default(true)
});

/**
 * Web3 options validation schema
 */
export const web3OptionsSchema = Joi.object({
  autoTransfer: Joi.boolean().default(false),
  transferDelay: Joi.number().min(0).optional(),
  brandWallet: Joi.string().optional(),
  gasLimit: Joi.number().min(0).optional(),
  maxGasPrice: Joi.number().min(0).optional()
});

/**
 * Create certificate request validation schema
 */
export const createCertificateRequestSchema = Joi.object({
  product: commonSchemas.mongoId.required(),
  recipient: commonSchemas.email.required(),
  metadata: certificateMetadataSchema.optional(),
  deliveryOptions: deliveryOptionsSchema.optional(),
  web3Options: web3OptionsSchema.optional(),
  customMessage: Joi.string().max(500).optional(),
  certificateLevel: certificateLevelSchema,
  expirationDate: Joi.date().optional()
});

/**
 * Update certificate request validation schema
 */
export const updateCertificateRequestSchema = Joi.object({
  metadata: certificateMetadataSchema.optional(),
  deliveryOptions: deliveryOptionsSchema.optional(),
  web3Options: web3OptionsSchema.optional(),
  customMessage: Joi.string().max(500).optional(),
  certificateLevel: certificateLevelSchema,
  expirationDate: Joi.date().optional()
});

/**
 * Transfer certificate request validation schema
 */
export const transferCertificateRequestSchema = Joi.object({
  brandWallet: Joi.string().required(),
  priority: Joi.string().valid('standard', 'priority', 'urgent').optional(),
  gasLimit: Joi.number().min(0).optional(),
  maxGasPrice: Joi.number().min(0).optional(),
  scheduleDate: Joi.date().optional()
});

/**
 * Batch create certificate request validation schema
 */
export const batchCreateCertificateRequestSchema = Joi.object({
  certificates: Joi.array().items(
    Joi.object({
      product: commonSchemas.mongoId.required(),
      recipient: commonSchemas.email.required(),
      metadata: certificateMetadataSchema.optional(),
      deliveryOptions: deliveryOptionsSchema.optional(),
      web3Options: web3OptionsSchema.optional()
    })
  ).min(1).max(100).required(),
  batchOptions: Joi.object({
    priority: Joi.string().valid('standard', 'priority', 'urgent').optional(),
    scheduleDate: Joi.date().optional(),
    notifyRecipients: Joi.boolean().default(true)
  }).optional()
});

/**
 * Certificate query validation schema
 */
export const certificateQuerySchema = Joi.object({
  status: certificateStatusSchema.optional(),
  product: commonSchemas.mongoId.optional(),
  recipient: commonSchemas.email.optional(),
  certificateLevel: certificateLevelSchema,
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'status', 'certificateLevel').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Export all certificate validation schemas
 */
export const certificateValidationSchemas = {
  certificateStatus: certificateStatusSchema,
  certificateLevel: certificateLevelSchema,
  certificateAttribute: certificateAttributeSchema,
  certificateMetadata: certificateMetadataSchema,
  deliveryOptions: deliveryOptionsSchema,
  web3Options: web3OptionsSchema,
  createCertificateRequest: createCertificateRequestSchema,
  updateCertificateRequest: updateCertificateRequestSchema,
  transferCertificateRequest: transferCertificateRequestSchema,
  batchCreateCertificateRequest: batchCreateCertificateRequestSchema,
  certificateQuery: certificateQuerySchema
};
