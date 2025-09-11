// src/lib/types/nft-certificates.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * NFT certificate status types
 * Based on backend INftCertificate model status field
 */
export type NftCertificateStatus = 'pending' | 'minted' | 'failed' | 'transferred' | 'pending_transfer' | 'transfer_failed' | 'revoked';

/**
 * Certificate level types
 * Based on backend INftCertificate model certificateData certificationLevel field
 */
export type NftCertificateLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Certificate data interface
 * Based on backend INftCertificate model certificateData field
 */
export interface CertificateData {
  serialNumber?: string;
  batchNumber?: string;
  qualityScore?: number;
  certificationLevel?: NftCertificateLevel;
  validUntil?: Date;
  issuerSignature?: string;
}

/**
 * Transfer history entry interface
 * Based on backend INftCertificate model transferHistory field
 */
export interface TransferHistoryEntry {
  from: string;
  to: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  gasUsed?: string;
  gasPrice?: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * NFT certificate interface
 * Based on backend INftCertificate model
 */
export interface NftCertificate {
  _id: string;
  business: string; // Business ID reference
  product: string; // Product ID reference
  recipient: string;
  tokenId: string;
  tokenUri: string;
  txHash: string;
  mintedAt: Date;
  
  // Enhanced blockchain data
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  status: NftCertificateStatus;
  
  // Auto-transfer functionality
  mintedToRelayer?: boolean;
  autoTransferEnabled?: boolean;
  transferDelayMinutes?: number;
  maxTransferAttempts?: number;
  transferTimeout?: number;
  transferAttempts?: number;
  nextTransferAttempt?: Date;
  transferredToBrand?: boolean;
  transferredAt?: Date;
  transferTxHash?: string;
  transferFailed?: boolean;
  transferError?: string;
  
  // Certificate metadata
  certificateData?: CertificateData;
  metadata?: Record<string, any>;
  
  // Transfer tracking
  transferHistory?: TransferHistoryEntry[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NFT certificate creation request
 * For creating new NFT certificates
 */
export interface CreateNftCertificateRequest {
  product: string;
  recipient: string;
  certificateData?: CertificateData;
  metadata?: Record<string, any>;
  autoTransferEnabled?: boolean;
  transferDelayMinutes?: number;
  maxTransferAttempts?: number;
  transferTimeout?: number;
}

/**
 * NFT certificate update request
 * For updating existing NFT certificates
 */
export interface UpdateNftCertificateRequest {
  certificateData?: CertificateData;
  metadata?: Record<string, any>;
  autoTransferEnabled?: boolean;
  transferDelayMinutes?: number;
  maxTransferAttempts?: number;
  transferTimeout?: number;
}

/**
 * NFT certificate transfer request
 * For transferring NFT certificates
 */
export interface TransferNftCertificateRequest {
  to: string;
  gasLimit?: number;
  gasPrice?: number;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * NFT certificate list response
 * For paginated NFT certificate lists
 */
export interface NftCertificateListResponse extends PaginatedResponse<NftCertificate> {
  certificates: NftCertificate[];
  analytics: {
    totalCertificates: number;
    mintedCertificates: number;
    transferredCertificates: number;
    failedCertificates: number;
    totalGasUsed: string;
    averageMintTime: number;
  };
}

/**
 * NFT certificate detail response
 * For detailed NFT certificate information
 */
export interface NftCertificateDetailResponse {
  certificate: NftCertificate;
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
  blockchainInfo: {
    contractAddress: string;
    tokenId: string;
    tokenUri: string;
    blockNumber: number;
    txHash: string;
    gasUsed: string;
    gasPrice: string;
  };
  transferHistory: TransferHistoryEntry[];
  metadata: Record<string, any>;
}

/**
 * NFT certificate analytics response
 * For NFT certificate analytics and reporting
 */
export interface NftCertificateAnalyticsResponse {
  overview: {
    totalCertificates: number;
    mintedCertificates: number;
    transferredCertificates: number;
    failedCertificates: number;
    totalGasUsed: string;
    averageMintTime: number;
    averageTransferTime: number;
  };
  statusDistribution: Array<{
    status: NftCertificateStatus;
    count: number;
    percentage: number;
  }>;
  levelDistribution: Array<{
    level: NftCertificateLevel;
    count: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    minted: number;
    transferred: number;
    failed: number;
    gasUsed: string;
  }>;
  gasAnalytics: {
    totalGasUsed: string;
    averageGasPerMint: string;
    averageGasPerTransfer: string;
    gasEfficiency: number;
  };
  transferAnalytics: {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    averageTransferTime: number;
    transferSuccessRate: number;
  };
}

/**
 * NFT certificate search response
 * For NFT certificate search results
 */
export interface NftCertificateSearchResponse extends PaginatedResponse<NftCertificate> {
  certificates: NftCertificate[];
  filters: {
    statuses: NftCertificateStatus[];
    levels: NftCertificateLevel[];
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
 * NFT certificate verification response
 * For verifying NFT certificate authenticity
 */
export interface NftCertificateVerificationResponse {
  isValid: boolean;
  certificate: NftCertificate;
  verificationDetails: {
    contractAddress: string;
    tokenId: string;
    blockNumber: number;
    transactionHash: string;
    verifiedAt: Date;
    blockchain: string;
    networkId: number;
  };
  certificateData: CertificateData;
  metadata: Record<string, any>;
  transferHistory: TransferHistoryEntry[];
}

/**
 * NFT certificate batch creation request
 * For creating multiple NFT certificates
 */
export interface BatchCreateNftCertificateRequest {
  certificates: Array<{
    product: string;
    recipient: string;
    certificateData?: CertificateData;
    metadata?: Record<string, any>;
  }>;
  batchOptions?: {
    autoTransferEnabled?: boolean;
    transferDelayMinutes?: number;
    maxTransferAttempts?: number;
    transferTimeout?: number;
  };
}

/**
 * NFT certificate batch creation response
 * For batch NFT certificate creation results
 */
export interface BatchCreateNftCertificateResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
  results: Array<{
    index: number;
    certificateId: string;
    status: 'success' | 'failed';
    txHash?: string;
    message?: string;
  }>;
}

/**
 * NFT certificate settings interface
 * For NFT certificate management settings
 */
export interface NftCertificateSettings {
  autoTransfer: {
    enabled: boolean;
    defaultDelayMinutes: number;
    maxTransferAttempts: number;
    transferTimeout: number;
  };
  gas: {
    defaultGasLimit: number;
    maxGasPrice: number;
    gasPriceMultiplier: number;
  };
  metadata: {
    includeProductData: boolean;
    includeBusinessData: boolean;
    includeTimestamp: boolean;
    customFields: string[];
  };
  notifications: {
    mintSuccess: boolean;
    transferSuccess: boolean;
    transferFailure: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * NFT certificate status validation schema
 */
export const nftCertificateStatusSchema = Joi.string()
  .valid('pending', 'minted', 'failed', 'transferred', 'pending_transfer', 'transfer_failed', 'revoked')
  .required()
  .messages({
    'any.only': 'Status must be one of: pending, minted, failed, transferred, pending_transfer, transfer_failed, revoked'
  });

/**
 * NFT certificate level validation schema
 */
export const nftCertificateLevelSchema = Joi.string()
  .valid('bronze', 'silver', 'gold', 'platinum')
  .optional()
  .messages({
    'any.only': 'Certificate level must be one of: bronze, silver, gold, platinum'
  });

/**
 * Certificate data validation schema
 */
export const certificateDataSchema = Joi.object({
  serialNumber: Joi.string().max(100).optional(),
  batchNumber: Joi.string().max(100).optional(),
  qualityScore: Joi.number().min(0).max(100).optional(),
  certificationLevel: nftCertificateLevelSchema,
  validUntil: Joi.date().optional(),
  issuerSignature: Joi.string().max(500).optional()
});

/**
 * Transfer history entry validation schema
 */
export const transferHistoryEntrySchema = Joi.object({
  from: Joi.string().required(),
  to: Joi.string().required(),
  txHash: Joi.string().required(),
  blockNumber: Joi.number().min(0).required(),
  timestamp: Joi.date().required(),
  gasUsed: Joi.string().optional(),
  gasPrice: Joi.string().optional(),
  status: Joi.string().valid('success', 'failed').required(),
  error: Joi.string().optional()
});

/**
 * Create NFT certificate request validation schema
 */
export const createNftCertificateRequestSchema = Joi.object({
  product: commonSchemas.mongoId.required(),
  recipient: commonSchemas.email.required(),
  certificateData: certificateDataSchema.optional(),
  metadata: Joi.object().optional(),
  autoTransferEnabled: Joi.boolean().default(false),
  transferDelayMinutes: Joi.number().min(0).max(1440).optional(), // 0 to 24 hours
  maxTransferAttempts: Joi.number().min(1).max(10).optional(),
  transferTimeout: Joi.number().min(60).max(3600).optional() // 1 minute to 1 hour
});

/**
 * Update NFT certificate request validation schema
 */
export const updateNftCertificateRequestSchema = Joi.object({
  certificateData: certificateDataSchema.optional(),
  metadata: Joi.object().optional(),
  autoTransferEnabled: Joi.boolean().optional(),
  transferDelayMinutes: Joi.number().min(0).max(1440).optional(),
  maxTransferAttempts: Joi.number().min(1).max(10).optional(),
  transferTimeout: Joi.number().min(60).max(3600).optional()
});

/**
 * Transfer NFT certificate request validation schema
 */
export const transferNftCertificateRequestSchema = Joi.object({
  to: Joi.string().required(),
  gasLimit: Joi.number().min(21000).optional(),
  gasPrice: Joi.number().min(1).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium')
});

/**
 * NFT certificate query validation schema
 */
export const nftCertificateQuerySchema = Joi.object({
  business: commonSchemas.mongoId.optional(),
  product: commonSchemas.mongoId.optional(),
  recipient: commonSchemas.email.optional(),
  status: nftCertificateStatusSchema.optional(),
  certificationLevel: nftCertificateLevelSchema.optional(),
  contractAddress: Joi.string().optional(),
  tokenId: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'mintedAt', 'transferredAt', 'tokenId').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Batch create NFT certificate request validation schema
 */
export const batchCreateNftCertificateRequestSchema = Joi.object({
  certificates: Joi.array().items(
    Joi.object({
      product: commonSchemas.mongoId.required(),
      recipient: commonSchemas.email.required(),
      certificateData: certificateDataSchema.optional(),
      metadata: Joi.object().optional()
    })
  ).min(1).max(100).required(),
  batchOptions: Joi.object({
    autoTransferEnabled: Joi.boolean().default(false),
    transferDelayMinutes: Joi.number().min(0).max(1440).optional(),
    maxTransferAttempts: Joi.number().min(1).max(10).optional(),
    transferTimeout: Joi.number().min(60).max(3600).optional()
  }).optional()
});

/**
 * NFT certificate settings validation schema
 */
export const nftCertificateSettingsSchema = Joi.object({
  autoTransfer: Joi.object({
    enabled: Joi.boolean().default(false),
    defaultDelayMinutes: Joi.number().min(0).max(1440).default(0),
    maxTransferAttempts: Joi.number().min(1).max(10).default(3),
    transferTimeout: Joi.number().min(60).max(3600).default(300)
  }).required(),
  gas: Joi.object({
    defaultGasLimit: Joi.number().min(21000).max(1000000).default(500000),
    maxGasPrice: Joi.number().min(1).max(1000).default(100),
    gasPriceMultiplier: Joi.number().min(1).max(10).default(1.2)
  }).required(),
  metadata: Joi.object({
    includeProductData: Joi.boolean().default(true),
    includeBusinessData: Joi.boolean().default(true),
    includeTimestamp: Joi.boolean().default(true),
    customFields: Joi.array().items(Joi.string().max(50)).optional()
  }).required(),
  notifications: Joi.object({
    mintSuccess: Joi.boolean().default(true),
    transferSuccess: Joi.boolean().default(true),
    transferFailure: Joi.boolean().default(true),
    emailNotifications: Joi.boolean().default(true),
    inAppNotifications: Joi.boolean().default(true)
  }).required()
});

/**
 * Export all NFT certificate validation schemas
 */
export const nftCertificateValidationSchemas = {
  nftCertificateStatus: nftCertificateStatusSchema,
  nftCertificateLevel: nftCertificateLevelSchema,
  certificateData: certificateDataSchema,
  transferHistoryEntry: transferHistoryEntrySchema,
  createNftCertificateRequest: createNftCertificateRequestSchema,
  updateNftCertificateRequest: updateNftCertificateRequestSchema,
  transferNftCertificateRequest: transferNftCertificateRequestSchema,
  nftCertificateQuery: nftCertificateQuerySchema,
  batchCreateNftCertificateRequest: batchCreateNftCertificateRequestSchema,
  nftCertificateSettings: nftCertificateSettingsSchema
};
