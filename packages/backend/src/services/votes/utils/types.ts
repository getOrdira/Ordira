import type { ProposalEvent } from '../../blockchain/voting.service';

export interface VoteEvent {
  proposalId: string;
  voter: string;
  support: boolean;
  blockNumber: number;
  txHash: string;
  timestamp?: number;
}

export interface DeployContractResult {
  votingAddress: string;
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
  deploymentCost?: string;
}

export interface CreateProposalResult {
  proposalId: string;
  txHash: string;
  blockNumber?: number;
  createdAt: Date;
}

export type ProposalStatus = 'draft' | 'active' | 'completed' | 'failed' | 'pending' | 'succeeded' | 'cancelled' | 'deactivated';

export interface ProposalDetails {
  proposalId: string;
  description: string;
  status?: ProposalStatus;
  createdAt?: Date;
  txHash?: string;
  voteCount?: number;
  category?: string;
  duration?: number;
}

export interface VoteRecord {
  voter: string;
  proposalId: string;
  txHash: string;
  createdAt?: Date;
  blockNumber?: number;
  selectedProductId: string;
  productName?: string;
  voterAddress?: string;
  gasUsed?: string;
}

export interface VotingStats {
  totalProposals: number;
  totalVotes: number;
  pendingVotes: number;
  contractAddress?: string;
  activeProposals?: number;
  participationRate?: string;
}

export interface ProcessPendingResult {
  txHash: string;
  totalVotes: number;
  submittedAt: Date;
  gasUsed?: string;
  blockNumber?: number;
}

export interface PendingVoteRecord {
  businessId: string;
  proposalId: string;
  userId: string;
  voteId: string;
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  createdAt: Date;
}

export interface VotingTrendSummary {
  dailyActivity: Record<string, number>;
  totalActivityInPeriod: number;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface VotingAnalytics {
  overview: {
    totalProposals: number;
    totalVotes: number;
    pendingVotes: number;
    participationRate: string;
    contractAddress?: string;
  };
  trends: VotingTrendSummary;
  proposalStats?: {
    proposalId: string;
    totalVotes: number;
    pendingVotes: number;
    participation: string;
  };
  recommendations?: string[];
  projectedActivity?: {
    nextWeekEstimate: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface VotingAnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  proposalId?: string;
  includeRecommendations?: boolean;
  includeTrends?: boolean;
  useCache?: boolean;
}

export interface BusinessVotesOptions {
  useCache?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'proposalId';
  sortOrder?: 'asc' | 'desc';
}

export interface PendingVotesFilters {
  proposalId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  useCache?: boolean;
}

export interface BusinessProposalsOptions {
  useCache?: boolean;
  searchQuery?: string;
  status?: 'active' | 'completed' | 'failed';
  limit?: number;
}

export interface VotingDashboardData {
  stats: VotingStats;
  analytics: VotingAnalytics;
  recentVotes: VoteRecord[];
  pendingCount: number;
  recommendations: string[];
}

export interface VotingHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cacheStatus: string;
  dbOptimizationStatus: string;
  averageQueryTime: number;
  optimizationsActive: string[];
}

export interface ContractInfo {
  totalProposals: number;
  totalVotes: number;
  activeProposals?: number;
}

export type VotingProposalEvent = ProposalEvent;
export type VotingContractVoteEvent = VoteEvent;
