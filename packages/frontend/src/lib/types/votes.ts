// src/lib/types/votes.ts

import Joi from 'joi';
import { ApiResponse, PaginatedResponse, ValidationError, TimeRange } from './common';
import { AnyUser } from './user';

/**
 * Voting Record interface
 * Based on backend votingRecord.model.ts - represents the actual voting data stored
 * This is the primary interface for product selection votes
 */
export interface VotingRecord {
  _id: string;
  business: string; // Business ID (ObjectId as string)
  proposalId: string;
  voteId: string; // Unique vote identifier
  timestamp: Date;
  
  // Product selection fields (primary voting data)
  selectedProductId: string; // Required - the product that was selected
  productName?: string; // Optional product name for reference
  productImageUrl?: string; // Optional product image URL
  selectionReason?: string; // Optional reason for selection
  
  // Enhanced voter data
  voterAddress?: string; // Blockchain wallet address
  voterEmail?: string; // For email gating integration
  
  // Blockchain data
  blockNumber?: number;
  gasUsed?: string;
  transactionHash?: string; // Track which batch transaction included this vote
  batchId?: string; // Reference to batch submission
  
  // Analytics and metadata
  userAgent?: string;
  ipAddress?: string;
  votingSource: 'web' | 'mobile' | 'api' | 'widget';
  
  // Email gating context
  emailGatingApplied?: boolean;
  emailGatingMode?: 'whitelist' | 'blacklist' | 'disabled';
  gatingRulesMatched?: string[]; // Which rules allowed/denied this vote
  
  // Processing status
  isVerified: boolean;
  verificationHash?: string;
  processedAt?: Date;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Pending Vote interface
 * Based on backend pendingVote.model.ts - votes awaiting blockchain processing
 */
export interface PendingVote {
  _id: string;
  business: string; // Business ID
  product: string; // Product ID (legacy field name from backend)
  customerEmail: string;
  selectedProducts: string[]; // Array of selected product IDs
  status: 'pending' | 'processed' | 'failed';
  txHash?: string;
  contractAddress?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  failureReason?: string;
}

/**
 * Vote interface (simplified for API responses)
 * Transformed version of VotingRecord for frontend consumption
 */
export interface Vote {
  id: string;
  proposalId: string;
  businessId: string;
  voter: string; // User ID or wallet address
  selectedProductId: string; // The selected product ID
  productName?: string; // Product name for display
  productImageUrl?: string; // Product image for display
  selectionReason?: string; // Why this product was selected
  votedAt: string;
  txHash?: string;
  blockNumber?: number;
  weight?: number; // If weighted voting is implemented
  ipAddress?: string;
  userAgent?: string;
  votingSource?: 'web' | 'mobile' | 'api' | 'widget';
}

/**
 * Product Selection Proposal interface
 * Represents a voting round where customers select their favorite products
 */
export interface ProductSelectionProposal {
  id: string;
  businessId: string;
  productIds: string[]; // Array of product IDs available for selection
  title: string;
  description: string;
  status: 'active' | 'closed' | 'canceled';
  startDate: string;
  endDate: string;
  
  // Selection requirements
  maxSelectionsPerVoter: number; // How many products can each voter select
  minSelectionsPerVoter: number; // Minimum selections required (default: 1)
  allowMultipleSelections: boolean; // Can voters select the same product multiple times
  
  // Analytics
  totalVotes: number;
  uniqueVoters: number;
  selectionDistribution: { productId: string; selectionCount: number; productName?: string }[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Legacy Proposal interface (for backward compatibility)
 * Keep this for any existing yes/no voting that might still exist
 */
export interface Proposal {
  id: string;
  businessId: string;
  productIds: string[]; // Array of product IDs in the proposal
  title: string;
  description: string;
  status: 'active' | 'closed' | 'canceled';
  startDate: string;
  endDate: string;
  quorum: number;
  totalVotes: number;
  voteDistribution: { productId: string; count: number }[]; // Distribution of selections
  createdAt: string;
  updatedAt: string;
}

/**
 * Vote Analytics Summary
 * Aligned with analytics in brandSettings and votes.controller.ts
 */
export interface VoteAnalytics {
  totalVotes: number;
  uniqueVoters: number;
  topProducts: { 
    productId: string; 
    selectionCount: number; 
    productName?: string;
    productImageUrl?: string;
  }[];
  participationRate: number;
  topVoters: { userId: string; voteCount: number; email?: string }[];
  timeSeries: { date: string; votes: number; uniqueVoters?: number }[];
  
  // Additional analytics for product selection
  averageSelectionsPerVoter: number;
  selectionDistribution: Record<string, number>; // productId -> count
  votingSourceBreakdown: Record<'web' | 'mobile' | 'api' | 'widget', number>;
  
  // Email gating analytics
  emailGatingStats?: {
    totalChecked: number;
    totalAllowed: number;
    totalDenied: number;
    denialReasons: Record<string, number>;
  };
}

/**
 * Create Product Selection Data
 * Data required to submit a product selection vote
 */
export interface CreateProductSelectionData {
  proposalId: string;
  selectedProductIds: string[]; // Array of selected product IDs (not just one)
  selectionReason?: string;
  voterEmail?: string; // For email gating
  metadata?: {
    source?: 'web' | 'mobile' | 'api' | 'widget';
    userAgent?: string;
    referrer?: string;
  };
}

/**
 * Legacy Create Vote Data (for backward compatibility)
 */
export interface CreateVoteData {
  proposalId: string;
  selectedProducts: string[]; // Array of favorite product IDs
  reason?: string;
}

/**
 * Batch Vote Submission Data
 * For submitting multiple votes at once
 */
export interface BatchVoteSubmissionData {
  proposalId: string;
  votes: Array<{
    voterEmail: string;
    selectedProductIds: string[];
    selectionReason?: string;
    metadata?: Record<string, any>;
  }>;
  batchMetadata?: {
    source: string;
    importedBy?: string;
    importedAt?: string;
  };
}

/**
 * Vote Verification Data
 * For blockchain vote verification
 */
export interface VoteVerificationData {
  voteId: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed?: string;
  verificationHash: string;
}

/**
 * Voting Statistics for Dashboard
 */
export interface VotingStatistics {
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  totalUniqueVoters: number;
  averageParticipationRate: number;
  mostPopularProducts: Array<{
    productId: string;
    productName: string;
    selectionCount: number;
    rank: number;
  }>;
  recentActivity: {
    votesToday: number;
    votesThisWeek: number;
    votesThisMonth: number;
    newVotersThisWeek: number;
  };
}

/**
 * Voting Filters for querying votes
 */
export interface VotingFilters {
  proposalId?: string;
  businessId?: string;
  productId?: string;
  voterEmail?: string;
  votingSource?: 'web' | 'mobile' | 'api' | 'widget';
  verified?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'timestamp' | 'productName' | 'verificationStatus';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Vote Response
 */
export type PaginatedVotes = PaginatedResponse<Vote>;
export type PaginatedVotingRecords = PaginatedResponse<VotingRecord>;

/**
 * Type guards
 */
export function isVote(obj: any): obj is Vote {
  return obj && typeof obj.id === 'string' && typeof obj.selectedProductId === 'string';
}

export function isVotingRecord(obj: any): obj is VotingRecord {
  return obj && typeof obj._id === 'string' && typeof obj.selectedProductId === 'string';
}

export function isPendingVote(obj: any): obj is PendingVote {
  return obj && typeof obj._id === 'string' && Array.isArray(obj.selectedProducts);
}

export function isProductSelectionProposal(obj: any): obj is ProductSelectionProposal {
  return obj && typeof obj.id === 'string' && Array.isArray(obj.productIds) && typeof obj.maxSelectionsPerVoter === 'number';
}

// Validation schemas using Joi (aligned with backend)

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
    .messages({
      'string.email': 'Must be a valid email address'
    }),
  
  productId: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.pattern.base': 'Product ID can only contain letters, numbers, hyphens and underscores',
      'string.max': 'Product ID cannot exceed 100 characters'
    })
};

/**
 * Schema for creating a product selection vote
 * Aligned with backend votingRecord validation
 */
export const createProductSelectionSchema = Joi.object({
  proposalId: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.max': 'Proposal ID cannot exceed 100 characters',
      'any.required': 'Proposal ID is required'
    }),
  
  selectedProductIds: Joi.array()
    .items(commonPatterns.productId.required())
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one product must be selected',
      'array.max': 'Cannot select more than 10 products',
      'any.required': 'Selected products are required'
    }),
  
  selectionReason: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Selection reason cannot exceed 1000 characters'
    }),
  
  voterEmail: commonPatterns.email.optional(),
  
  metadata: Joi.object({
    source: Joi.string()
      .valid('web', 'mobile', 'api', 'widget')
      .default('web')
      .optional(),
    userAgent: Joi.string().trim().max(500).optional(),
    referrer: Joi.string().uri().optional()
  }).optional()
});

/**
 * Legacy schema for backward compatibility
 * Matches original voting system expectations
 */
export const createVoteSchema = Joi.object({
  proposalId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Proposal ID is required'
    }),
  
  selectedProducts: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one product must be selected',
      'any.required': 'Selected products are required'
    }),
  
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

/**
 * Schema for batch vote submission
 * Aligned with backend bulk operations
 */
export const batchVoteSubmissionSchema = Joi.object({
  proposalId: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.max': 'Proposal ID cannot exceed 100 characters',
      'any.required': 'Proposal ID is required'
    }),
  
  votes: Joi.array()
    .items(Joi.object({
      voterEmail: commonPatterns.email.required(),
      selectedProductIds: Joi.array()
        .items(commonPatterns.productId.required())
        .min(1)
        .max(10)
        .required(),
      selectionReason: Joi.string()
        .trim()
        .max(1000)
        .optional(),
      metadata: Joi.object().optional()
    }))
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.min': 'At least one vote is required',
      'array.max': 'Cannot submit more than 1000 votes at once',
      'any.required': 'Votes array is required'
    }),
  
  batchMetadata: Joi.object({
    source: Joi.string().trim().max(100).optional(),
    importedBy: Joi.string().trim().max(100).optional(),
    importedAt: Joi.date().iso().optional()
  }).optional()
});

/**
 * Schema for voting filters
 * Matches backend query patterns
 */
export const votingFiltersSchema = Joi.object({
  proposalId: Joi.string().trim().max(100).optional(),
  businessId: commonPatterns.mongoId.optional(),
  productId: commonPatterns.productId.optional(),
  voterEmail: commonPatterns.email.optional(),
  votingSource: Joi.string()
    .valid('web', 'mobile', 'api', 'widget')
    .optional(),
  verified: Joi.boolean().optional(),
  
  dateRange: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().min(Joi.ref('start')).required()
  }).optional(),
  
  sortBy: Joi.string()
    .valid('timestamp', 'productName', 'verificationStatus', 'voterEmail')
    .default('timestamp')
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
 * Schema for vote verification data
 * For blockchain verification updates
 */
export const voteVerificationSchema = Joi.object({
  voteId: Joi.string()
    .trim()
    .max(100)
    .required()
    .messages({
      'string.max': 'Vote ID cannot exceed 100 characters',
      'any.required': 'Vote ID is required'
    }),
  
  transactionHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'Transaction hash must be a valid Ethereum transaction hash',
      'any.required': 'Transaction hash is required'
    }),
  
  blockNumber: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.min': 'Block number must be non-negative',
      'any.required': 'Block number is required'
    }),
  
  gasUsed: Joi.string()
    .pattern(/^[0-9]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Gas used must be a numeric string'
    }),
  
  verificationHash: Joi.string()
    .pattern(/^[a-fA-F0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'Verification hash must be a valid SHA-256 hash',
      'any.required': 'Verification hash is required'
    })
});

/**
 * Schema for product selection proposal creation
 * Aligned with backend proposal validation
 */
export const createProductSelectionProposalSchema = Joi.object({
  businessId: commonPatterns.mongoId.required(),
  
  productIds: Joi.array()
    .items(commonPatterns.productId.required())
    .min(2)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least 2 products are required for a selection proposal',
      'array.max': 'Cannot have more than 50 products in a proposal',
      'any.required': 'Product IDs are required'
    }),
  
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(2000)
    .required()
    .messages({
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required'
    }),
  
  startDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.min': 'Start date must be in the future',
      'any.required': 'Start date is required'
    }),
  
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required'
    }),
  
  maxSelectionsPerVoter: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(1)
    .messages({
      'number.min': 'Must allow at least 1 selection per voter',
      'number.max': 'Cannot allow more than 10 selections per voter'
    }),
  
  minSelectionsPerVoter: Joi.number()
    .integer()
    .min(1)
    .max(Joi.ref('maxSelectionsPerVoter'))
    .default(1)
    .messages({
      'number.min': 'Must require at least 1 selection per voter',
      'number.max': 'Cannot require more selections than the maximum allowed'
    }),
  
  allowMultipleSelections: Joi.boolean().default(false)
});