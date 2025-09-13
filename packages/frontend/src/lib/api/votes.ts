// src/lib/api/votes.ts

import apiClient from './client';
import { ApiError } from '@/lib/errors';

// ===== BACKEND-ALIGNED TYPE DEFINITIONS =====

/**
 * VotingRecord interface - matches backend votingRecord.model.ts
 * This is the primary voting data structure stored in the database
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
 * PendingVote interface - matches backend pendingVote.model.ts
 * Votes awaiting blockchain processing
 */
export interface PendingVote {
  _id: string;
  businessId: string;
  proposalId: string;
  userId: string;
  voteId: string;
  
  // Enhanced fields
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  
  // Security and validation
  userSignature?: string;
  ipAddress?: string;
  userAgent?: string;
  isProcessed: boolean;
  processedAt?: Date;
  verificationHash?: string;
  isVerified: boolean;
  voteChoice?: string;
  
  // Timestamps
  createdAt: string;
}

/**
 * Proposal interface - matches backend proposal structure
 */
export interface Proposal {
  _id: string;
  business: string;
  proposalId: string; // Unique proposal identifier
  title: string;
  description: string;
  category: string;
  votingOptions: Array<{
    id: string;
    text: string;
    description?: string;
  }>;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  totalVotes: number;
  createdAt: string;
  updatedAt: string;
}

// ===== BACKEND-ALIGNED RESPONSE INTERFACES =====

/**
 * Response interface for proposals list - matches backend controller response
 */
export interface ProposalsResponse {
  success: boolean;
  message: string;
  data: {
    proposals: Proposal[];
    stats: {
      totalProposals: number;
      activeProposals: number;
      completedProposals: number;
      totalVotes: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    contractAddress?: string;
  };
}

/**
 * Response interface for proposal details - matches backend controller response
 */
export interface ProposalDetailResponse {
  success: boolean;
  message: string;
  data: {
    proposal: Proposal;
    votes: VotingRecord[];
    analytics: {
      totalVotes: number;
      participationRate: string;
      topProducts: Array<{
        productId: string;
        votes: number;
        percentage: string;
      }>;
    };
  };
}

/**
 * Response interface for proposal results - matches backend controller response
 */
export interface ProposalResultsResponse {
  success: boolean;
  message: string;
  data: {
    proposal: Proposal;
    results: {
      totalVotes: number;
      participationRate: string;
      winner: {
        productId: string;
        votes: number;
        percentage: string;
      };
      breakdown: Array<{
        productId: string;
        votes: number;
        percentage: string;
      }>;
    };
    participation: {
      totalEligible: number;
      totalVoted: number;
      participationRate: string;
    };
    generatedAt: string;
  };
}

/**
 * Response interface for voting stats - matches backend service response
 */
export interface VotingStatsResponse {
  success: boolean;
  message: string;
  data: {
    stats: {
      totalVotes: number;
      pendingVotes: number;
      processedVotes: number;
      totalProposals: number;
      activeProposals: number;
    };
    analytics: {
      dailyActivity: Record<string, number>;
      topProposals: Array<{
        id: string;
        description: string;
        totalVotes: number;
        status: string;
        createdAt: string;
      }>;
    };
    trends: {
      voteGrowth: number;
      participationTrend: string;
      engagementScore: number;
    };
  };
}

/**
 * Response interface for voting analytics - matches backend analytics service
 */
export interface VotingAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    overview: {
      totalOnChainVotes: number;
      byProposal: Record<string, number>;
      usedLast30d: number;
      voteLimit: number;
      remainingVotes: number;
    };
    timeSeries: Array<{
      date: string;
      votes: number;
      proposals: number;
    }>;
    trends: {
      voteGrowth: number;
      participationTrend: string;
      engagementScore: number;
    };
    engagement: {
      totalVotes: number;
      uniqueVoters: number;
      activeProposals: number;
      averageVotesPerUser: string;
      participationRate: string;
    };
  };
}

/**
 * Create vote data - matches backend submitVoteSchema validation
 */
export interface CreateVoteData {
  proposalId: string;
  optionId?: string;
  voteId?: string;
  voterAddress?: string;
  signature?: string;
  voteWeight?: number;
  delegation?: {
    delegatedFrom?: string;
    delegationProof?: string;
  };
  reasoning?: string;
  isPublic?: boolean;
  timestamp?: number;
  // Legacy fields for compatibility
  selectedProducts?: string[];
  vote?: any;
  reason?: string;
}

/**
 * Create proposal data - matches backend createProposalSchema validation
 */
export interface CreateProposalData {
  title: string;
  description: string;
  category: string;
  votingOptions: Array<{
    id: string;
    text: string;
    description?: string;
  }>;
  startDate: Date;
  endDate: Date;
  maxVotesPerUser?: number;
  minVotesPerUser?: number;
  allowDelegation?: boolean;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Batch vote submission data - matches backend batchSubmitVoteSchema
 */
export interface BatchVoteData {
  proposalIds: string[];
  voteType?: string;
  reason?: string;
}

// Legacy response wrapper for compatibility
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ===== VOTING CONTRACT MANAGEMENT =====

/**
 * Deploys new voting contract for the business.
 * @param contractData - Contract deployment parameters
 * @returns Promise<any>
 */
export const deployVotingContract = async (contractData: {
  contractName?: string;
  votingDuration?: number;
  minimumVotes?: number;
  settings?: any;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/votes/deploy', contractData);
    return response;
  } catch (error) {
    throw new ApiError('Failed to deploy voting contract', 500);
  }
};

// ===== PROPOSAL MANAGEMENT =====

/**
 * Creates a new proposal for voting.
 * Maps to: POST /api/votes/proposals
 * Matches backend: createProposal controller with createProposalSchema validation
 */
export const createProposal = async (data: CreateProposalData): Promise<ProposalDetailResponse> => {
  try {
    const response = await apiClient.post('/api/votes/proposals', data) as any;
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to create proposal', 500);
  }
};

/**
 * Fetches list of proposals for the business.
 * @param params - Query parameters
 * @returns Promise<ProposalsResponse>
 */
export const getProposals = async (params?: {
  status?: 'active' | 'completed' | 'pending';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<ProposalsResponse> => {
  try {
    const response = await apiClient.get<ProposalsResponse>('/api/votes/proposals', {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch proposals', 500);
  }
};

/**
 * Gets proposal details by ID.
 * @param proposalId - Proposal ID
 * @returns Promise<ProposalDetailResponse>
 */
export const getProposalDetails = async (proposalId: string): Promise<ProposalDetailResponse> => {
  try {
    const response = await apiClient.get<ProposalDetailResponse>(`/api/votes/proposals/${proposalId}`);
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch proposal details', 500);
  }
};

/**
 * Gets proposal voting results.
 * @param proposalId - Proposal ID
 * @returns Promise<ProposalResultsResponse>
 */
export const getProposalResults = async (proposalId: string): Promise<ProposalResultsResponse> => {
  try {
    const response = await apiClient.get<ProposalResultsResponse>(`/api/votes/proposals/${proposalId}/results`);
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch proposal results', 500);
  }
};

// ===== VOTING OPERATIONS =====

/**
 * Submits votes for proposals (with batching logic).
 * Maps to: POST /api/votes
 * Matches backend: submitVote controller with submitVoteSchema validation
 */
export const submitVotes = async (data: BatchVoteData): Promise<{
  success: boolean;
  data: {
    votes: Array<{
      proposalId: string;
      voteId: string;
      voteType: string;
      recordedAt: string;
    }>;
    batch?: {
      batchId: string;
      status: string;
      estimatedConfirmationTime?: string;
    };
    pending?: Array<{
      proposalId: string;
      voteId: string;
      status: string;
    }>;
  };
}> => {
  try {
    const response = await apiClient.post('/api/votes', data) as any;
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to submit votes', 500);
  }
};

/**
 * Lists all votes for the business.
 * Maps to: GET /api/votes
 * Matches backend: listVotes controller with listVotesQuerySchema validation
 */
export const getVotes = async (params?: {
  proposalId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    votes: VotingRecord[];
    pending: PendingVote[];
    stats: {
      totalVotes: number;
      pendingVotes: number;
      processedVotes: number;
      totalProposals: number;
      activeProposals: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}> => {
  try {
    const response = await apiClient.get('/api/votes', {
      params,
    }) as any;
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch votes', 500);
  }
};


// ===== VOTING ANALYTICS =====

/**
 * Gets voting statistics and analytics.
 * @param params - Query parameters
 * @returns Promise<VotingStatsResponse>
 */
export const getVotingStats = async (params?: {
  startDate?: string;
  endDate?: string;
  proposalId?: string;
}): Promise<VotingStatsResponse> => {
  try {
    const response = await apiClient.get('/api/votes/stats', {
      params,
    }) as any;
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch voting stats', 500);
  }
};

/**
 * Gets overall voting analytics across all proposals.
 * @param params - Query parameters
 * @returns Promise<VotingAnalyticsResponse>
 */
export const getVotingAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: 'daily' | 'weekly' | 'monthly';
}): Promise<VotingAnalyticsResponse> => {
  try {
    const response = await apiClient.get('/api/votes/analytics', {
      params,
    }) as any;
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch voting analytics', 500);
  }
};

// ===== ADMIN OPERATIONS =====

/**
 * Force submits pending votes (admin action).
 * @returns Promise<any>
 */
export const forceSubmitPendingVotes = async (): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/votes/force-submit');
    return response;
  } catch (error) {
    throw new ApiError('Failed to force submit pending votes', 500);
  }
};


// ===== PROMISE-BASED FUNCTIONS =====
// Updated versions for non-hook contexts

/**
 * Fetches proposals using updated backend structure.
 */
export async function fetchProposals(businessId: string, params?: {
  status?: "active" | "completed" | "pending";
  page?: number;
  limit?: number;
}): Promise<Proposal[]> {
  const response = await getProposals(params);
  return response.data.proposals;
}

/**
 * Submits user votes using user API endpoint.
 * Maps to: POST /api/users/vote
 * Matches backend: submitUserVote controller with user vote validation
 */
export async function submitUserVotes(payload: CreateVoteData): Promise<any> {
  const response = await apiClient.post('/api/users/vote', {
    proposalId: payload.proposalId,
    selectedProducts: payload.selectedProducts,
    vote: payload.vote,
    reason: payload.reason,
  }) as any;
  return response.data;
}

/**
 * Checks user vote status using user API endpoint.
 * Maps to: GET /api/users/vote/status/:proposalId
 */
export async function checkUserVoteStatus(proposalId: string): Promise<boolean> {
  const response = await apiClient.get(`/api/users/vote/status/${proposalId}`) as any;
  return response.data.voteStatus.hasVoted;
}

/**
 * Gets user's personal voting history.
 * Maps to: GET /api/users/votes
 */
export const getMyVotes = async (params?: {
  proposalId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    votes: VotingRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}> => {
  try {
    const response = await apiClient.get('/api/users/votes', {
      params,
    }) as any;
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch user votes', 500);
  }
};

// ===== VOTE VERIFICATION =====

/**
 * Verifies a vote on the blockchain
 */
export const verifyVote = async (data: {
  voteId: string;
  transactionHash?: string;
  signature?: string;
  verificationCode?: string;
}): Promise<{ success: boolean; verified: boolean; details: any }> => {
  try {
    const response = await apiClient.post('/api/votes/verify', data) as any;
    return {
      success: response.data.success,
      verified: response.data.data.verified,
      details: response.data.data.details
    };
  } catch (error) {
    throw new ApiError('Failed to verify vote', 500);
  }
};

// ===== BATCH OPERATIONS =====

/**
 * Submits batch votes for multiple proposals
 */
export const submitBatchVotes = async (data: {
  proposalId: string;
  votes: Array<{
    voterEmail: string;
    selectedProductIds: string[];
    selectionReason?: string;
    metadata?: Record<string, any>;
  }>;
  batchId?: string;
}): Promise<{ success: boolean; processed: number; successful: number; failed: number; results: any[] }> => {
  try {
    const response = await apiClient.post('/api/votes/batch', data) as any;
    return {
      success: response.data.success,
      processed: response.data.data.processed,
      successful: response.data.data.successful,
      failed: response.data.data.failed,
      results: response.data.data.results
    };
  } catch (error) {
    throw new ApiError('Failed to submit batch votes', 500);
  }
};

// ===== EXPORT OPERATIONS =====

/**
 * Exports voting data in various formats
 */
export const exportVotingData = async (filters: {
  format: 'csv' | 'xlsx' | 'json';
  startDate?: string;
  endDate?: string;
  proposalId?: string;
  businessId?: string;
  includeAnalytics?: boolean;
}): Promise<{ downloadUrl: string; filename: string; recordCount: number }> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {downloadUrl: string; filename: string; recordCount: number}}>('/api/votes/export', filters);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to export voting data', 500);
  }
};

// ===== MANUFACTURER INSIGHTS =====

/**
 * Gets manufacturer voting insights for a specific brand
 */
export const getManufacturerVotingInsights = async (brandId: string): Promise<{
  success: boolean;
  data: {
    brandId: string;
    totalVotes: number;
    topProducts: Array<{ productId: string; votes: number; productName: string }>;
    votingTrends: any[];
    customerEngagement: any;
    recommendations: string[];
  };
}> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/manufacturer/brands/${brandId}/voting-insights`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer voting insights', 500);
  }
};

// ===== VOTING LEADERBOARD =====

/**
 * Gets voting leaderboard for a business
 */
export const getVotingLeaderboard = async (businessId: string, timeframe: string = '30d'): Promise<{
  success: boolean;
  data: {
    leaderboard: Array<{
      userId: string;
      userName: string;
      totalVotes: number;
      rank: number;
      engagementScore: number;
    }>;
    timeframe: string;
    totalParticipants: number;
  };
}> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/votes/leaderboard/${businessId}`, {
      params: { timeframe }
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch voting leaderboard', 500);
  }
};

// ===== CUSTOMER PREFERENCES =====

/**
 * Gets customer voting preferences for a business
 */
export const getCustomerVotingPreferences = async (businessId: string): Promise<{
  success: boolean;
  data: {
    preferences: {
      topCategories: Array<{ category: string; votes: number }>;
      preferredProducts: Array<{ productId: string; votes: number; productName: string }>;
      votingPatterns: any;
      demographics: any;
    };
    insights: string[];
  };
}> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/manufacturer/brands/${businessId}/customer-preferences`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch customer voting preferences', 500);
  }
};

// ===== PENDING VOTES =====

/**
 * Gets pending votes for a business
 */
export const getPendingVotes = async (businessId?: string): Promise<{
  success: boolean;
  data: {
    pendingVotes: Array<{
      voteId: string;
      proposalId: string;
      userId: string;
      submittedAt: string;
      status: 'pending' | 'processing' | 'failed';
      retryCount: number;
    }>;
    totalPending: number;
    processingQueue: number;
  };
}> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/votes/pending', {
      params: businessId ? { businessId } : {}
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch pending votes', 500);
  }
};

// ===== PRODUCT VOTING ANALYTICS =====

/**
 * Gets product-specific voting analytics
 */
export const getProductVotingAnalytics = async (productId: string, filters?: {
  timeRange?: { start: string; end: string };
  includeProposals?: boolean;
}): Promise<{
  success: boolean;
  data: {
    productId: string;
    totalVotes: number;
    voteHistory: Array<{ date: string; votes: number }>;
    proposals: Array<{ proposalId: string; votes: number; proposalTitle: string }>;
    demographics: any;
    trends: any;
  };
}> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${productId}/analytics/votes`, {
      params: filters
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product voting analytics', 500);
  }
};
