import { logger } from '../../utils/logger';
import {
  votingAnalyticsService,
  votingStatsService,
  votingDataService,
  votingDashboardService,
  votingContractService,
  votingProposalsService,
  votingProposalManagementService,
  votingContractDeploymentService
} from '../votes';
import type {
  BusinessProposalsOptions,
  BusinessVotesOptions,
  PendingVoteRecord,
  PendingVotesFilters,
  ProposalDetails,
  VoteRecord,
  VotingAnalytics,
  VotingAnalyticsOptions,
  VotingContractVoteEvent,
  VotingDashboardData,
  VotingHealthStatus,
  VotingStats
} from '../votes';
import type {
  CreateProposalInput,
  UpdateProposalInput,
  DeployProposalResult,
  ProposalStatistics
} from '../votes/features/votingProposalManagement.service';
import type {
  DeployContractResult,
  VotingContractSettings
} from '../votes/features/votingContractDeployment.service';

export {
  DeployContractResult,
  CreateProposalResult,
  ProposalDetails,
  VoteRecord,
  VotingStats,
  ProcessPendingResult,
  PendingVoteRecord,
  VotingAnalytics
} from '../votes';

export type {
  CreateProposalInput,
  UpdateProposalInput,
  DeployProposalResult,
  ProposalStatistics,
  VotingContractSettings
};

export class VotingService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly contractService = votingContractService,
    private readonly statsService = votingStatsService,
    private readonly analyticsService = votingAnalyticsService,
    private readonly dashboardService = votingDashboardService,
    private readonly proposalsService = votingProposalsService,
    private readonly proposalManagementService = votingProposalManagementService,
    private readonly contractDeploymentService = votingContractDeploymentService
  ) {}

  async getOptimizedVotingAnalytics(
    businessId: string,
    options: VotingAnalyticsOptions = {}
  ): Promise<VotingAnalytics> {
    return this.analyticsService.getVotingAnalytics(businessId, options);
  }

  async getOptimizedVotingStats(businessId: string, useCache: boolean = true): Promise<VotingStats> {
    return this.statsService.getVotingStats(businessId, useCache);
  }

  async getVotingStats(businessId: string, useCache: boolean = true): Promise<VotingStats> {
    return this.getOptimizedVotingStats(businessId, useCache);
  }

  async getOptimizedBusinessVotes(
    businessId: string,
    options: BusinessVotesOptions = {}
  ): Promise<VoteRecord[]> {
    const votes = await this.dataService.getBusinessVotes(businessId, options);

    if (votes.length > 0) {
      return votes;
    }

    const contractAddress = await this.dataService.getVoteContractAddress(businessId);
    if (!contractAddress) {
      return [];
    }

    try {
      const voteEvents = await this.contractService.getVoteEvents(contractAddress);
      logger.debug('Business votes retrieved from blockchain fallback', {
        businessId,
        count: voteEvents.length
      });
      return voteEvents.map((event) => this.mapVoteEventToRecord(event));
    } catch (error: any) {
      logger.warn('Failed to retrieve blockchain vote events', {
        businessId,
        error: error.message
      });
      return [];
    }
  }

  async getOptimizedPendingVotes(
    businessId: string,
    filters: PendingVotesFilters = {}
  ): Promise<PendingVoteRecord[]> {
    return this.dataService.getPendingVotes(businessId, filters);
  }

  async getOptimizedBusinessProposals(
    businessId: string,
    options: BusinessProposalsOptions = {}
  ): Promise<ProposalDetails[]> {
    return this.proposalsService.getBusinessProposals(businessId, options);
  }

  async clearVotingCaches(businessId: string): Promise<void> {
    await this.dashboardService.clearVotingCaches(businessId);
  }

  async getVotingDashboard(businessId: string): Promise<VotingDashboardData> {
    return this.dashboardService.getVotingDashboard(businessId);
  }

  async getVotingServiceHealth(): Promise<VotingHealthStatus> {
    return this.dashboardService.getVotingServiceHealth();
  }

  // ==========================================
  // PROPOSAL MANAGEMENT METHODS
  // ==========================================

  /**
   * Create a new voting proposal with rich metadata
   */
  async createProposal(businessId: string, input: CreateProposalInput): Promise<any> {
    return this.proposalManagementService.createProposal(businessId, input);
  }

  /**
   * Update an existing proposal (only if in draft status)
   */
  async updateProposal(businessId: string, proposalId: string, updates: UpdateProposalInput): Promise<any> {
    return this.proposalManagementService.updateProposal(businessId, proposalId, updates);
  }

  /**
   * Activate a proposal to start voting
   */
  async activateProposal(businessId: string, proposalId: string): Promise<any> {
    return this.proposalManagementService.activateProposal(businessId, proposalId);
  }

  /**
   * Deactivate a proposal to stop voting
   */
  async deactivateProposal(businessId: string, proposalId: string): Promise<any> {
    return this.proposalManagementService.deactivateProposal(businessId, proposalId);
  }

  /**
   * Complete a proposal (mark as finished)
   */
  async completeProposal(businessId: string, proposalId: string): Promise<any> {
    return this.proposalManagementService.completeProposal(businessId, proposalId);
  }

  /**
   * Cancel a proposal
   */
  async cancelProposal(businessId: string, proposalId: string): Promise<any> {
    return this.proposalManagementService.cancelProposal(businessId, proposalId);
  }

  /**
   * Deploy a proposal to the blockchain
   */
  async deployProposalToBlockchain(businessId: string, proposalId: string): Promise<DeployProposalResult> {
    return this.proposalManagementService.deployProposalToBlockchain(businessId, proposalId);
  }

  /**
   * Get detailed statistics for a specific proposal
   */
  async getProposalStatistics(businessId: string, proposalId: string): Promise<ProposalStatistics> {
    return this.proposalManagementService.getProposalStatistics(businessId, proposalId);
  }

  /**
   * Get a single proposal by ID
   */
  async getProposal(businessId: string, proposalId: string): Promise<any> {
    return this.proposalManagementService.getProposal(businessId, proposalId);
  }

  /**
   * List all proposals for a business
   */
  async listProposals(
    businessId: string,
    options: {
      status?: 'draft' | 'active' | 'completed' | 'cancelled' | 'deactivated';
      category?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    return this.proposalManagementService.listProposals(businessId, options);
  }

  /**
   * Delete a proposal (only if in draft status)
   */
  async deleteProposal(businessId: string, proposalId: string): Promise<void> {
    return this.proposalManagementService.deleteProposal(businessId, proposalId);
  }

  // ==========================================
  // CONTRACT DEPLOYMENT METHODS
  // ==========================================

  /**
   * Deploy a new voting contract for a business
   */
  async deployVotingContract(
    businessId: string,
    settings: VotingContractSettings = {}
  ): Promise<DeployContractResult> {
    return this.contractDeploymentService.deployVotingContract(businessId, settings);
  }

  /**
   * Get the voting contract address for a business
   */
  async getVotingContractAddress(businessId: string): Promise<string | undefined> {
    return this.contractDeploymentService.getVotingContractAddress(businessId);
  }

  /**
   * Verify that a voting contract exists for a business
   */
  async verifyContractExists(businessId: string): Promise<boolean> {
    return this.contractDeploymentService.verifyContractExists(businessId);
  }

  /**
   * Get contract deployment information
   */
  async getContractDeploymentInfo(businessId: string): Promise<{
    contractAddress: string | undefined;
    isDeployed: boolean;
    deployedAt?: Date;
  }> {
    return this.contractDeploymentService.getContractDeploymentInfo(businessId);
  }

  private mapVoteEventToRecord(event: VotingContractVoteEvent): VoteRecord {
    return {
      voter: event.voter,
      proposalId: event.proposalId,
      txHash: event.txHash,
      createdAt: new Date(event.timestamp || Date.now()),
      blockNumber: event.blockNumber,
      selectedProductId: event.proposalId,
      productName: undefined,
      voterAddress: event.voter,
      gasUsed: undefined
    };
  }
}

export const votingService = new VotingService();

