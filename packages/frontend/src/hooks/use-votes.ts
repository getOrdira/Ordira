// src/hooks/use-votes.ts

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  VotingRecord,
  ProductSelectionProposal, 
  CreateProductSelectionData,
  VotingFilters,
  VoteAnalytics,
  VotingStatistics,
  BatchVoteSubmissionData,
  VoteVerificationData
} from '@/lib/typessss/votes';
import * as votesApi from '@/lib/apis/votes';
import { useAuth } from './use-auth';
import { useNotifications } from './use-utilities';

interface UseVotesOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for managing product selection proposals
 * Maps to backend /api/analytics/votes and votes.controller.ts
 */
export function useProposals(filters?: VotingFilters, options: UseVotesOptions = {}) {
  const { enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['proposals', filters],
    queryFn: () => votesApi.getProposals(filters),
    enabled,
    refetchInterval,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting a single proposal with detailed analytics
 * Maps to backend votes.controller.ts getProposalResults
 */
export function useProposal(proposalId: string, options: UseVotesOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: () => votesApi.getProposalDetails(proposalId),
    enabled: enabled && !!proposalId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for product selection voting
 * Maps to backend /api/users/vote endpoint
 */
export function useProductSelection() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  const [submissionState, setSubmissionState] = useState<{
    isSubmitting: boolean;
    currentStep: 'validating' | 'submitting' | 'verifying' | 'complete' | null;
    error: string | null;
  }>({
    isSubmitting: false,
    currentStep: null,
    error: null
  });

  const submitSelection = useMutation({
    mutationFn: async (data: CreateProductSelectionData) => {
      setSubmissionState({
        isSubmitting: true,
        currentStep: 'validating',
        error: null
      });

      // Step 1: Basic validation
      if (!data.proposalId || !data.selectedProductIds?.length) {
        throw new Error('Invalid selection data');
      }

      setSubmissionState(prev => ({ ...prev, currentStep: 'submitting' }));

      // Step 2: Submit selection (maps to /api/users/vote POST endpoint)
      const result = await votesApi.submitUserVotes(data);

      setSubmissionState(prev => ({ ...prev, currentStep: 'verifying' }));

      // Step 3: Basic verification (no blockchain integration for now)
      // Future: Add blockchain verification if needed

      setSubmissionState(prev => ({ ...prev, currentStep: 'complete' }));

      return result;
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['vote-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['voting-records'] });
      queryClient.invalidateQueries({ queryKey: ['user-voting-history'] });

      addNotification({
        type: 'success',
        title: 'Vote Submitted Successfully',
        message: `Your product selection has been recorded${result.txHash ? ' and verified on the blockchain' : ''}.`,
        category: 'product_selection'
      });

      setSubmissionState({
        isSubmitting: false,
        currentStep: null,
        error: null
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to submit product selection';
      
      setSubmissionState({
        isSubmitting: false,
        currentStep: null,
        error: errorMessage
      });

      addNotification({
        type: 'error',
        title: 'Vote Submission Failed',
        message: errorMessage,
        category: 'product_selection'
      });
    }
  });

  return {
    submitSelection: submitSelection.mutateAsync,
    submissionState,
    clearError: () => setSubmissionState(prev => ({ ...prev, error: null }))
  };
}

/**
 * Hook for batch vote submissions (brand admin use)
 * Maps to backend bulk voting operations
 */
export function useBatchVoteSubmission() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (data: BatchVoteSubmissionData) => {
      return votesApi.submitBatchVotes(data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['vote-analytics'] });

      addNotification({
        type: 'success',
        title: 'Batch Submission Complete',
        message: `Successfully processed ${result.successful} of ${result.processed} votes.`,
        category: 'product_selection'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Batch Submission Failed',
        message: error.message || 'Failed to process batch vote submission',
        category: 'product_selection'
      });
    }
  });
}

/**
 * Hook for voting analytics
 * Maps to backend /api/analytics/votes endpoint
 */
export function useVoteAnalytics(filters?: {
  proposalId?: string;
  timeRange?: { start: string; end: string };
  businessId?: string;
}) {
  return useQuery({
    queryKey: ['vote-analytics', filters],
    queryFn: () => votesApi.getVotingAnalytics({
      startDate: filters?.timeRange?.start,
      endDate: filters?.timeRange?.end,
      breakdown: 'daily'
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for voting statistics (dashboard use)
 * Maps to backend analytics aggregation endpoints
 */
export function useVotingStatistics(businessId?: string) {
  return useQuery({
    queryKey: ['voting-statistics', businessId],
    queryFn: () => votesApi.getVotingStats({ proposalId: businessId }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for managing user's voting records
 * Maps to backend /api/users/voting-history endpoint
 */
export function useUserVotingRecords(filters?: VotingFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-voting-history', user?._id, filters],
    queryFn: () => votesApi.getMyVotes({
      page: 1,
      limit: 20
    }),
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for checking if user can vote on a proposal
 * Maps to backend /api/users/vote/status/:proposalId endpoint
 */
export function useCanVote(proposalId: string) {
  const { user } = useAuth();
  
  const [canVote, setCanVote] = useState<{
    canVote: boolean;
    reason?: string;
    hasVoted?: boolean;
    remainingSelections?: number;
  } | null>(null);

  const { data: voteStatus } = useQuery({
    queryKey: ['vote-status', proposalId, user?._id],
    queryFn: () => votesApi.checkUserVoteStatus(proposalId),
    enabled: !!user && !!proposalId,
    refetchInterval: 30 * 1000, // 30 seconds
    staleTime: 15 * 1000, // 15 seconds
  });

  useEffect(() => {
    if (typeof voteStatus === 'boolean') {
      setCanVote({ canVote: !voteStatus, hasVoted: voteStatus });
    } else if (!user) {
      setCanVote({ canVote: false, reason: 'Authentication required' });
    }
  }, [voteStatus, user]);

  const recheckEligibility = useCallback(async () => {
    if (!user || !proposalId) {
      setCanVote({ canVote: false, reason: 'Authentication required' });
      return;
    }

    try {
      const eligibility = await votesApi.checkUserVoteStatus(proposalId);
      setCanVote({ canVote: !eligibility, hasVoted: eligibility });
    } catch (error) {
      console.error('Failed to check voting eligibility:', error);
      setCanVote({ canVote: false, reason: 'Unable to verify eligibility' });
    }
  }, [user, proposalId]);

  return {
    ...canVote,
    recheckEligibility
  };
}

/**
 * Hook for real-time vote updates
 * Uses WebSocket connection for live data
 */
export function useRealTimeVotes(proposalId: string, enabled: boolean = true) {
  const [liveData, setLiveData] = useState<{
    totalVotes: number;
    recentVotes: VotingRecord[];
    topProducts: Array<{ productId: string; count: number; productName?: string }>;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !proposalId) return;

    // WebSocket connection for real-time updates
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    const ws = new WebSocket(`${wsUrl}/votes/${proposalId}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLiveData(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [proposalId, enabled]);

  return liveData;
}

/**
 * Hook for proposal creation (brand admin)
 * Maps to backend proposal creation endpoints
 */
export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      productIds: string[];
      startDate: string;
      endDate: string;
      maxSelectionsPerVoter: number;
      minSelectionsPerVoter?: number;
    }) => {
      return votesApi.createProposal({
        title: data.title,
        description: data.description,
        category: 'product_selection',
        votingOptions: data.productIds.map((id, index) => ({
          id: `option_${index}`,
          text: `Product ${id}`,
          description: `Product selection option ${index + 1}`
        })),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        maxVotesPerUser: data.maxSelectionsPerVoter,
        minVotesPerUser: data.minSelectionsPerVoter,
        isPublic: true
      });
    },
    onSuccess: (newProposal) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      addNotification({
        type: 'success',
        title: 'Proposal Created',
        message: `Product selection proposal "${newProposal.data?.proposal?.title || 'New Proposal'}" has been created successfully.`,
        category: 'product_selection'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Failed to Create Proposal',
        message: error.message || 'Unable to create product selection proposal',
        category: 'product_selection'
      });
    }
  });
}

/**
 * Hook for vote verification (blockchain integration)
 * Maps to backend blockchain verification endpoints
 */
export function useVoteVerification() {
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (data: VoteVerificationData) => {
      return votesApi.verifyVote(data);
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Vote Verified',
        message: 'Your vote has been successfully verified on the blockchain.',
        category: 'product_selection'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Verification Failed',
        message: error.message || 'Failed to verify vote on blockchain',
        category: 'product_selection'
      });
    }
  });
}

/**
 * Hook for product voting analytics (product-specific)
 * Maps to backend /api/products/:id/analytics/votes endpoint
 */
export function useProductVotingAnalytics(productId: string, filters?: {
  timeRange?: { start: string; end: string };
  includeProposals?: boolean;
}) {
  return useQuery({
    queryKey: ['product-voting-analytics', productId, filters],
    queryFn: () => votesApi.getProductVotingAnalytics(productId, filters),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for manufacturer voting insights
 * Maps to backend /api/manufacturer/brands/:brandId/voting-trends endpoint
 */
export function useManufacturerVotingInsights(brandId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['manufacturer-voting-insights', brandId],
    queryFn: () => votesApi.getManufacturerVotingInsights(brandId),
    enabled: !!user && user.role === 'manufacturer' && !!brandId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for export voting data
 * Maps to backend export endpoints
 */
export function useExportVotes() {
  const { addNotification } = useNotifications();

  return useMutation({
    mutationFn: async (filters: VotingFilters & { 
      format: 'csv' | 'xlsx' | 'json';
      includeAnalytics?: boolean;
    }) => {
      return votesApi.exportVotingData(filters);
    },
    onSuccess: (result) => {
      // Trigger download
      if (result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename || 'voting-data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      addNotification({
        type: 'success',
        title: 'Export Complete',
        message: `Voting data exported successfully (${result.recordCount} records).`,
        category: 'product_selection'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.message || 'Failed to export voting data',
        category: 'product_selection'
      });
    }
  });
}

/**
 * Hook for voting leaderboard (brand admin)
 * Maps to backend /api/manufacturer/brands/:brandId/voting-leaderboard
 */
export function useVotingLeaderboard(businessId?: string, timeframe: string = '30d') {
  return useQuery({
    queryKey: ['voting-leaderboard', businessId, timeframe],
    queryFn: () => votesApi.getVotingLeaderboard(businessId!, timeframe),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for customer voting preferences
 * Maps to backend /api/manufacturer/brands/:brandId/customer-preferences
 */
export function useCustomerVotingPreferences(businessId?: string) {
  return useQuery({
    queryKey: ['customer-voting-preferences', businessId],
    queryFn: () => votesApi.getCustomerVotingPreferences(businessId!),
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for pending votes management
 * Useful for brand admins to see votes awaiting blockchain processing
 */
export function usePendingVotes(businessId?: string) {
  return useQuery({
    queryKey: ['pending-votes', businessId],
    queryFn: () => votesApi.getPendingVotes(businessId),
    enabled: !!businessId,
    refetchInterval: 10 * 1000, // 10 seconds for pending items
    staleTime: 5 * 1000, // 5 seconds
  });
}