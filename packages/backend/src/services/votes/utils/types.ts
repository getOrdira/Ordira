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
  id?: string;
  businessId: string;
  proposalId: string;
  userId: string;
  voteId: string;
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  userSignature?: string;
  isProcessed?: boolean;
  processedAt?: Date;
  createdAt: Date;
  isValid?: boolean;
  canProcess?: boolean;
  validationErrors?: string[];
  eligibleForBatch?: boolean;
  estimatedGasCost?: string;
  processingPriority?: number;
  estimatedConfirmationTime?: string;
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

export interface PendingVoteListOptions {
  proposalId?: string;
  userId?: string;
  includeProcessed?: boolean;
  onlyProcessed?: boolean;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
}

export interface PendingVoteStats {
  totalPending: number;
  totalProcessed: number;
  oldestPendingAge?: string;
  newestPendingAge?: string;
  averageProcessingTime?: string;
  processingEfficiency: number;
  averageBatchSize: number;
  gasOptimization: number;
}

export interface BatchingInfo {
  readyForBatch: number;
  batchThreshold: number;
  autoProcessEnabled: boolean;
  nextBatchSize: number;
  estimatedGasCost: string;
  lastProcessedAt?: Date;
  canProcessNow: boolean;
  reasonCannotProcess?: string;
  batchEfficiency: number;
  estimatedSavings: string;
  recommendedAction: string;
}

export interface ProposalBreakdown {
  proposalId: string;
  pendingCount: number;
  readyForBatch: boolean;
  oldestVoteAge?: string;
  voteDistribution: {
    for: number;
    against: number;
    abstain: number;
  };
}

export interface BatchProcessingOptions {
  voteIds?: string[];
  proposalId?: string;
  maxGasPrice?: string;
  forceProcess?: boolean;
  contractAddress: string;
}

export interface BatchProcessingResult {
  success: boolean;
  batchId?: string;
  totalVotes: number;
  processedCount: number;
  failedCount: number;
  skippedCount: number;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  totalCost?: string;
  processedVotes?: string[];
  failedVotes?: Array<{ voteId: string; error: string }>;
  errors?: string[];
  error?: string;
}

export interface BatchConfig {
  batchThreshold: number;
  autoProcessEnabled: boolean;
  maxBatchSize: number;
  processingDelay: number;
  lastUpdatedAt: Date;
}

export interface ValidationResult {
  totalValidated: number;
  eligibleCount: number;
  ineligibleCount: number;
  warningCount: number;
  eligibleVotes: string[];
  ineligibleVotes: Array<{
    voteId: string;
    reason: string;
    canFix: boolean;
    recommendation: string;
  }>;
  warnings: string[];
  canProcessBatch: boolean;
  recommendedBatchSize: number;
  estimatedGasCost: string;
  blockers: string[];
}

export interface RelatedVotes {
  sameProposal: number;
  sameUser: number;
  totalForProposal: number;
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
