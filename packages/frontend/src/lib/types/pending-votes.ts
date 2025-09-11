// src/lib/types/pending-votes.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Pending vote interface
 * Based on backend IPendingVote model
 */
export interface PendingVote {
  _id: string;
  businessId: string;
  proposalId: string;
  userId: string;
  voteId: string;
  
  // Product selection fields
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  
  // Verification and security
  userSignature?: string;
  ipAddress?: string;
  userAgent?: string;
  isProcessed: boolean;
  processedAt?: Date;
  verificationHash?: string;
  isVerified: boolean;
  voteChoice?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pending vote creation request
 * For creating new pending votes
 */
export interface CreatePendingVoteRequest {
  businessId: string;
  proposalId: string;
  userId: string;
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  userSignature?: string;
  voteChoice?: string;
}

/**
 * Pending vote update request
 * For updating existing pending votes
 */
export interface UpdatePendingVoteRequest {
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  userSignature?: string;
  voteChoice?: string;
  isProcessed?: boolean;
  isVerified?: boolean;
}

/**
 * Pending vote list response
 * For paginated pending vote lists
 */
export interface PendingVoteListResponse extends PaginatedResponse<PendingVote> {
  votes: PendingVote[];
  analytics: {
    totalVotes: number;
    processedVotes: number;
    pendingVotes: number;
    verifiedVotes: number;
    unverifiedVotes: number;
    averageProcessingTime: number;
  };
}

/**
 * Pending vote detail response
 * For detailed pending vote information
 */
export interface PendingVoteDetailResponse {
  vote: PendingVote;
  business: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  user: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  product: {
    _id: string;
    title: string;
    description?: string;
    imageUrl?: string;
  };
  proposal: {
    _id: string;
    title: string;
    description?: string;
    status: string;
  };
  verification: {
    isVerified: boolean;
    verificationHash?: string;
    verifiedAt?: Date;
    verificationMethod?: string;
  };
  processing: {
    isProcessed: boolean;
    processedAt?: Date;
    processingTime?: number;
    processingMethod?: string;
  };
}

/**
 * Pending vote analytics response
 * For pending vote analytics and reporting
 */
export interface PendingVoteAnalyticsResponse {
  overview: {
    totalVotes: number;
    processedVotes: number;
    pendingVotes: number;
    verifiedVotes: number;
    unverifiedVotes: number;
    averageProcessingTime: number;
    verificationRate: number;
  };
  processingStats: {
    totalProcessed: number;
    averageProcessingTime: number;
    processingMethods: Array<{
      method: string;
      count: number;
      averageTime: number;
    }>;
  };
  verificationStats: {
    totalVerified: number;
    verificationRate: number;
    verificationMethods: Array<{
      method: string;
      count: number;
      successRate: number;
    }>;
  };
  businessStats: Array<{
    business: {
      _id: string;
      businessName: string;
    };
    totalVotes: number;
    processedVotes: number;
    pendingVotes: number;
    verificationRate: number;
  }>;
  productStats: Array<{
    product: {
      _id: string;
      title: string;
    };
    voteCount: number;
    selectionRate: number;
  }>;
  monthlyStats: Array<{
    month: string;
    votes: number;
    processed: number;
    verified: number;
  }>;
}

/**
 * Pending vote search response
 * For pending vote search results
 */
export interface PendingVoteSearchResponse extends PaginatedResponse<PendingVote> {
  votes: PendingVote[];
  filters: {
    businessIds: string[];
    proposalIds: string[];
    userIds: string[];
    processingStatus: boolean[];
    verificationStatus: boolean[];
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
 * Pending vote batch processing request
 * For processing multiple pending votes
 */
export interface BatchProcessPendingVotesRequest {
  voteIds: string[];
  processingMethod: 'auto' | 'manual' | 'bulk';
  verificationMethod?: 'signature' | 'email' | 'manual';
  notifyUsers?: boolean;
}

/**
 * Pending vote batch processing response
 * For batch processing results
 */
export interface BatchProcessPendingVotesResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    voteId: string;
    error: string;
  }>;
  results: Array<{
    voteId: string;
    status: 'processed' | 'failed' | 'skipped';
    processingTime?: number;
    message?: string;
  }>;
}

/**
 * Pending vote verification request
 * For verifying pending votes
 */
export interface VerifyPendingVoteRequest {
  voteId: string;
  verificationMethod: 'signature' | 'email' | 'manual';
  verificationData?: any;
}

/**
 * Pending vote settings interface
 * For pending vote management settings
 */
export interface PendingVoteSettings {
  processing: {
    autoProcess: boolean;
    processingDelay: number; // in minutes
    maxRetries: number;
    retryDelay: number; // in minutes
  };
  verification: {
    requireVerification: boolean;
    verificationMethods: string[];
    signatureRequired: boolean;
    emailVerification: boolean;
  };
  notifications: {
    voteReceived: boolean;
    voteProcessed: boolean;
    voteVerified: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
  security: {
    trackIpAddress: boolean;
    trackUserAgent: boolean;
    requireSignature: boolean;
    maxVotesPerUser: number;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Create pending vote request validation schema
 */
export const createPendingVoteRequestSchema = Joi.object({
  businessId: Joi.string().max(100).required(),
  proposalId: Joi.string().max(100).required(),
  userId: Joi.string().max(100).required(),
  selectedProductId: Joi.string().max(100).required(),
  productName: Joi.string().max(200).optional(),
  productImageUrl: commonSchemas.optionalUrl,
  selectionReason: Joi.string().max(500).optional(),
  userSignature: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).optional(),
  voteChoice: Joi.string().max(100).optional()
});

/**
 * Update pending vote request validation schema
 */
export const updatePendingVoteRequestSchema = Joi.object({
  productName: Joi.string().max(200).optional(),
  productImageUrl: commonSchemas.optionalUrl,
  selectionReason: Joi.string().max(500).optional(),
  userSignature: Joi.string().pattern(/^0x[a-fA-F0-9]+$/).optional(),
  voteChoice: Joi.string().max(100).optional(),
  isProcessed: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional()
});

/**
 * Pending vote query validation schema
 */
export const pendingVoteQuerySchema = Joi.object({
  businessId: Joi.string().optional(),
  proposalId: Joi.string().optional(),
  userId: Joi.string().optional(),
  selectedProductId: Joi.string().optional(),
  isProcessed: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'processedAt', 'voteId').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Batch process pending votes request validation schema
 */
export const batchProcessPendingVotesRequestSchema = Joi.object({
  voteIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
  processingMethod: Joi.string().valid('auto', 'manual', 'bulk').required(),
  verificationMethod: Joi.string().valid('signature', 'email', 'manual').optional(),
  notifyUsers: Joi.boolean().default(true)
});

/**
 * Verify pending vote request validation schema
 */
export const verifyPendingVoteRequestSchema = Joi.object({
  voteId: Joi.string().required(),
  verificationMethod: Joi.string().valid('signature', 'email', 'manual').required(),
  verificationData: Joi.object().optional()
});

/**
 * Pending vote settings validation schema
 */
export const pendingVoteSettingsSchema = Joi.object({
  processing: Joi.object({
    autoProcess: Joi.boolean().default(false),
    processingDelay: Joi.number().min(0).max(1440).default(0), // 0 to 24 hours
    maxRetries: Joi.number().min(0).max(10).default(3),
    retryDelay: Joi.number().min(0).max(1440).default(60) // 0 to 24 hours
  }).required(),
  verification: Joi.object({
    requireVerification: Joi.boolean().default(true),
    verificationMethods: Joi.array().items(Joi.string()).required(),
    signatureRequired: Joi.boolean().default(false),
    emailVerification: Joi.boolean().default(true)
  }).required(),
  notifications: Joi.object({
    voteReceived: Joi.boolean().default(true),
    voteProcessed: Joi.boolean().default(true),
    voteVerified: Joi.boolean().default(true),
    emailNotifications: Joi.boolean().default(true),
    inAppNotifications: Joi.boolean().default(true)
  }).required(),
  security: Joi.object({
    trackIpAddress: Joi.boolean().default(true),
    trackUserAgent: Joi.boolean().default(true),
    requireSignature: Joi.boolean().default(false),
    maxVotesPerUser: Joi.number().min(1).max(1000).default(10)
  }).required()
});

/**
 * Export all pending vote validation schemas
 */
export const pendingVoteValidationSchemas = {
  createPendingVoteRequest: createPendingVoteRequestSchema,
  updatePendingVoteRequest: updatePendingVoteRequestSchema,
  pendingVoteQuery: pendingVoteQuerySchema,
  batchProcessPendingVotesRequest: batchProcessPendingVotesRequestSchema,
  verifyPendingVoteRequest: verifyPendingVoteRequestSchema,
  pendingVoteSettings: pendingVoteSettingsSchema
};
