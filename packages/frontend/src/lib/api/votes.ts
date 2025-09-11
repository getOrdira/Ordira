// src/lib/api/votes.ts

import { useQuery, UseQueryResult, useMutation, UseMutationResult } from '@tanstack/react-query';
import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types

// Type definitions aligned with backend
export interface Proposal {
  _id: string;
  business: string;
  title: string;
  description: string;
  products: string[]; // Product IDs
  status: 'active' | 'completed' | 'pending';
  startDate: Date;
  endDate: Date;
  totalVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vote {
  _id: string;
  user: string;
  proposal: string;
  business: string;
  vote: any; // Vote data structure
  selectedProducts?: string[];
  reason?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingVote {
  proposalId: string;
  vote: any;
  submittedAt: Date;
  status: 'pending' | 'processing' | 'submitted';
}

// Response interfaces matching backend structure
export interface ProposalsResponse {
  success: boolean;
  message: string;
  data: {
    proposals: Proposal[];
    stats: any;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface ProposalDetailResponse {
  success: boolean;
  message: string;
  data: {
    proposal: Proposal;
    votes: Vote[];
    analytics: any;
  };
}

export interface ProposalResultsResponse {
  success: boolean;
  message: string;
  data: {
    proposal: Proposal;
    results: any;
    breakdown: any;
    participation: any;
  };
}

export interface VotingStatsResponse {
  success: boolean;
  message: string;
  data: {
    stats: any;
    analytics: any;
    trends: any;
  };
}

export interface VotingAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    overview: any;
    trends: any;
    topProposals: any[];
    engagement: any;
  };
}

export interface CreateVoteData {
  proposalId: string;
  selectedProducts?: string[];
  vote?: any;
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
 * @param data - Proposal creation data
 * @returns Promise<ProposalDetailResponse>
 */
export const createProposal = async (data: {
  title: string;
  description: string;
  products: string[];
  endDate: Date;
  settings?: any;
}): Promise<ProposalDetailResponse> => {
  try {
    const response = await apiClient.post<ProposalDetailResponse>('/api/votes/proposals', data);
    return response;
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
 * Submits votes for proposals.
 * @param data - Vote submission data
 * @returns Promise<any>
 */
export const submitVotes = async (data: {
  votes: Array<{
    proposalId: string;
    vote: any;
    selectedProducts?: string[];
  }>;
  batchId?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/votes', data);
    return response;
  } catch (error) {
    throw new ApiError('Failed to submit votes', 500);
  }
};

/**
 * Lists all votes for the business.
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getVotes = async (params?: {
  proposalId?: string;
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/votes', {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch votes', 500);
  }
};

/**
 * Gets user's personal voting history.
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getMyVotes = async (params?: {
  page?: number;
  limit?: number;
  proposalStatus?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/votes/my-votes', {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch my votes', 500);
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
    const response = await apiClient.get<VotingStatsResponse>('/api/votes/stats', {
      params,
    });
    return response;
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
    const response = await apiClient.get<VotingAnalyticsResponse>('/api/votes/analytics', {
      params,
    });
    return response;
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

// ===== REACT QUERY HOOKS =====
// Keeping the existing React Query patterns but updated for new endpoints

/**
 * Hook for fetching proposals for a specific business/brand.
 * Updated to use correct backend endpoint structure.
 */
export const useProposals = (businessId: string, params?: {
  status?: "active" | "completed" | "pending";
  page?: number;
  limit?: number;
}): UseQueryResult<ProposalsResponse, ApiError> => {
  return useQuery<ProposalsResponse, ApiError>({
    queryKey: ['proposals', businessId, params],
    queryFn: async () => {
      // Use the new getProposals function which handles backend response structure
      return await getProposals(params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount: number, error: ApiError) => error.statusCode >= 500 && failureCount < 3,
    enabled: !!businessId,
  });
};

/**
 * Mutation hook for submitting user votes.
 * Updated to use user API endpoint for individual vote submission.
 */
export const useSubmitVotes = (): UseMutationResult<any, ApiError, CreateVoteData> => {
  return useMutation<any, ApiError, CreateVoteData>({
    mutationFn: async (payload: CreateVoteData) => {
      // Use the user API endpoint for individual vote submission
      const response = await apiClient.post<{success: boolean; data: any}>('/api/users/vote', {
        proposalId: payload.proposalId,
        selectedProducts: payload.selectedProducts,
        vote: payload.vote,
        reason: payload.reason,
      });
      return response;
    },
    onError: (error: ApiError) => {
      console.error('Vote submission error:', error);
    },
  });
};

/**
 * Hook for checking user vote status for a proposal.
 * Updated to use user API endpoint.
 */
export const useVoteStatus = (proposalId: string): UseQueryResult<boolean, ApiError> => {
  return useQuery<boolean, ApiError>({
    queryKey: ['voteStatus', proposalId],
    queryFn: async () => {
      const response = await apiClient.get<{success: boolean; data: {voteStatus: {hasVoted: boolean}}}>(`/api/users/vote/status/${proposalId}`);
      return response.data.voteStatus.hasVoted;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: (failureCount: number, error: ApiError) => error.statusCode >= 500 && failureCount < 3,
    enabled: !!proposalId,
  });
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
 */
export async function submitUserVotes(payload: CreateVoteData): Promise<any> {
  const response = await apiClient.post<{success: boolean; data: any}>('/api/users/vote', {
    proposalId: payload.proposalId,
    selectedProducts: payload.selectedProducts,
    vote: payload.vote,
    reason: payload.reason,
  });
  return response.data;
}

/**
 * Checks user vote status using user API endpoint.
 */
export async function checkUserVoteStatus(proposalId: string): Promise<boolean> {
  const response = await apiClient.get<{success: boolean; data: {voteStatus: {hasVoted: boolean}}}>(`/api/users/vote/status/${proposalId}`);
  return response.data.voteStatus.hasVoted;
}
