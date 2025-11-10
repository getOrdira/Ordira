/**
 * Vote Types
 * 
 * Re-exports backend vote types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  VoteEvent,
  DeployContractResult,
  CreateProposalResult,
  ProposalStatus,
  ProposalDetails,
  VoteRecord,
  VotingStats,
  ProcessPendingResult,
  PendingVoteRecord,
  VotingTrendSummary,
  VotingAnalytics,
  VotingAnalyticsOptions,
  BusinessVotesOptions,
  PendingVotesFilters,
  BusinessProposalsOptions,
  VotingDashboardData,
  VotingHealthStatus,
  ContractInfo,
  VotingProposalEvent,
  VotingContractVoteEvent
} from '@backend/services/votes/utils/types';
import type {
  CreateProposalInput,
  UpdateProposalInput,
  DeployProposalResult,
  ProposalStatistics
} from '@backend/services/votes/features/votingProposalManagement.service';

// Re-export all backend types
export type {
  VoteEvent,
  DeployContractResult,
  CreateProposalResult,
  ProposalStatus,
  ProposalDetails,
  VoteRecord,
  VotingStats,
  ProcessPendingResult,
  PendingVoteRecord,
  VotingTrendSummary,
  VotingAnalytics,
  VotingAnalyticsOptions,
  BusinessVotesOptions,
  PendingVotesFilters,
  BusinessProposalsOptions,
  VotingDashboardData,
  VotingHealthStatus,
  ContractInfo,
  VotingProposalEvent,
  VotingContractVoteEvent,
  CreateProposalInput,
  UpdateProposalInput,
  DeployProposalResult,
  ProposalStatistics
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Vote form data with frontend-specific fields
 */
export interface VoteFormData {
  proposalId: string;
  selectedProductId: string;
  selectionReason?: string;
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    productPreview?: {
      name: string;
      imageUrl?: string;
      description?: string;
    };
  };
}

/**
 * Proposal form data with frontend-specific fields
 */
export interface ProposalFormData {
  description: string;
  category?: string;
  duration?: number;
  productOptions?: string[]; // Product IDs
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    productOptionsData?: Array<{
      id: string;
      name: string;
      imageUrl?: string;
    }>;
  };
}

/**
 * Vote record display with enhanced UI fields
 */
export interface VoteRecordDisplay extends VoteRecord {
  _ui?: {
    formattedTimestamp?: string;
    relativeTime?: string;
    productImageUrl?: string;
    statusBadge?: 'pending' | 'confirmed' | 'failed';
    canRetry?: boolean;
  };
}

/**
 * Proposal display with enhanced UI fields
 */
export interface ProposalDisplay extends ProposalDetails {
  _ui?: {
    formattedTimestamp?: string;
    relativeTime?: string;
    statusBadge?: 'draft' | 'active' | 'completed' | 'failed';
    voteProgress?: number; // Percentage
    timeRemaining?: string;
    productOptions?: Array<{
      id: string;
      name: string;
      imageUrl?: string;
      voteCount?: number;
    }>;
  };
}

/**
 * Voting dashboard view options
 */
export interface VotingDashboardViewOptions {
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'all';
  statusFilter?: ProposalStatus[];
  proposalFilter?: string[];
  viewMode?: 'list' | 'grid' | 'timeline';
  sortBy?: 'date' | 'votes' | 'status';
  sortOrder?: 'asc' | 'desc';
}

