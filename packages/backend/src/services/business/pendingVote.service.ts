// src/services/business/pendingVote.service.ts

import { PendingVote, IPendingVote } from '../../models/pendingVote.model';
import { BrandSettings } from '../../models/brandSettings.model';
import { VotingService } from '../blockchain/voting.service';
import { createAppError } from '../../middleware/error.middleware';
import { Types } from 'mongoose';

// ===== INTERFACES =====

export interface PendingVoteRecord {
  id: string;
  businessId: string;
  proposalId: string;
  userId: string;
  voteId: string;
  selectedProductId: string;
  productName?: string;
  userSignature?: string;
  isProcessed: boolean;
  processedAt?: Date;
  createdAt: Date;
  isValid: boolean;
  canProcess: boolean;
  validationErrors?: string[];
  eligibleForBatch: boolean;
  estimatedGasCost?: string;
  processingPriority: number;
  estimatedConfirmationTime?: string;
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

/**
 * Enhanced pending vote service for batch processing and vote queue management
 */
export class PendingVoteService {

  // ===== PRIVATE HELPERS =====

  private async getBrandSettings(businessId: string) {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings) {
      throw createAppError('Brand settings not found', 404, 'BRAND_SETTINGS_NOT_FOUND');
    }
    return settings;
  }

  private calculateProcessingPriority(vote: IPendingVote): number {
    let priority = 50; // Base priority
    
    // Age-based priority (older = higher priority)
    const ageInHours = (Date.now() - vote.createdAt.getTime()) / (1000 * 60 * 60);
    priority += Math.min(ageInHours * 2, 30); // Max 30 points for age
    
    // Signature verification bonus
    if (vote.isVerified) priority += 10;
    
    // Vote choice priority (abstain gets lower priority)
    if (vote.voteChoice === 'abstain') priority -= 5;
    
    return Math.round(priority);
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== CORE PENDING VOTE OPERATIONS =====

async listPendingVotes(
  businessId: string,
  options: PendingVoteListOptions = {}
): Promise<{
  votes: PendingVoteRecord[];
  total: number;
  pending: number;
  processed: number;
}> {
  try {
    if (!businessId?.trim()) {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }

    // Build query
    const query: any = { businessId };
    
    if (options.proposalId) query.proposalId = options.proposalId;
    if (options.userId) query.userId = options.userId;
    
    if (options.onlyProcessed) {
      query.isProcessed = true;
    } else if (!options.includeProcessed) {
      query.isProcessed = false;
    }

    // Build sort - Fix the SortOrder type issue
    const sortField = options.sortBy || 'createdAt';
    const sortOrder: 1 | -1 = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // Execute queries - Remove .lean() to get full Mongoose documents
    const [votes, totalCount, pendingCount, processedCount] = await Promise.all([
      PendingVote.find(query)
        .sort(sort)
        .limit(options.limit || 50)
        .skip(options.offset || 0), // Removed .lean()
      PendingVote.countDocuments(query),
      PendingVote.countDocuments({ businessId, isProcessed: false }),
      PendingVote.countDocuments({ businessId, isProcessed: true })
    ]);

    // Enhance vote records with additional data - Now works with full documents
    const enhancedVotes: PendingVoteRecord[] = votes.map(vote => ({
      id: vote._id.toString(),
      businessId: vote.businessId,
      proposalId: vote.proposalId,
      userId: vote.userId,
      voteId: vote.voteId,
      selectedProductId: vote.selectedProductId,
      productName: vote.productName,
      productImageUrl: vote.productImageUrl,
      selectionReason: vote.selectionReason,
      userSignature: vote.userSignature,
      isProcessed: vote.isProcessed,
      processedAt: vote.processedAt,
      createdAt: vote.createdAt,
      // Additional enhanced fields - Now works properly
      isValid: this.validateVoteRecord(vote),
      canProcess: this.canProcessVote(vote),
      validationErrors: this.getValidationErrors(vote),
      eligibleForBatch: this.isEligibleForBatch(vote),
      estimatedGasCost: this.estimateVoteGasCost(),
      processingPriority: this.calculateProcessingPriority(vote),
      estimatedConfirmationTime: '2-5 minutes'
    }));

    return {
      votes: enhancedVotes,
      total: totalCount,
      pending: pendingCount,
      processed: processedCount
    };
  } catch (error: any) {
    console.error('List pending votes error:', error);
    throw createAppError(`Failed to list pending votes: ${error.message}`, 500, 'LIST_PENDING_VOTES_FAILED');
  }
};

async getPendingVoteById(voteId: string, businessId: string): Promise<PendingVoteRecord | null> {
  try {
    const vote = await PendingVote.findOne({ _id: voteId, businessId }).lean();
    if (!vote) return null;

    // Create a compatible object for validation methods
    const voteForValidation = {
      ...vote,
      _id: vote._id,
      businessId: vote.businessId,
      proposalId: vote.proposalId,
      userId: vote.userId,
      voteId: vote.voteId,
      selectedProductId: vote.selectedProductId,
      isProcessed: vote.isProcessed,
      createdAt: vote.createdAt
    } as any; // Cast to bypass strict typing for validation methods

    return {
      id: vote._id.toString(),
      businessId: vote.businessId,
      proposalId: vote.proposalId,
      userId: vote.userId,
      voteId: vote.voteId,
      selectedProductId: vote.selectedProductId,
      productName: vote.productName,
      userSignature: vote.userSignature,
      isProcessed: vote.isProcessed,
      processedAt: vote.processedAt,
      createdAt: vote.createdAt,
      isValid: this.validateVoteRecord(voteForValidation),
      canProcess: this.canProcessVote(voteForValidation),
      validationErrors: this.getValidationErrors(voteForValidation),
      eligibleForBatch: this.isEligibleForBatch(voteForValidation),
      estimatedGasCost: this.estimateVoteGasCost(),
      processingPriority: this.calculateProcessingPriority(voteForValidation),
      estimatedConfirmationTime: '2-5 minutes'
    };
  } catch (error: any) {
    console.error('Get pending vote by ID error:', error);
    throw createAppError(`Failed to get pending vote: ${error.message}`, 500, 'GET_PENDING_VOTE_FAILED');
  }
};

  async getPendingVoteStats(businessId: string): Promise<PendingVoteStats> {
    try {
      const [stats, processedStats] = await Promise.all([
        PendingVote.aggregate([
          { $match: { businessId, isProcessed: false } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              oldestVote: { $min: '$createdAt' },
              newestVote: { $max: '$createdAt' }
            }
          }
        ]),
        PendingVote.aggregate([
          { $match: { businessId, isProcessed: true } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgProcessingTime: {
                $avg: {
                  $subtract: ['$processedAt', '$createdAt']
                }
              }
            }
          }
        ])
      ]);

      const pendingStats = stats[0] || { count: 0 };
      const processedStatsData = processedStats[0] || { count: 0, avgProcessingTime: 0 };

      const totalVotes = pendingStats.count + processedStatsData.count;
      const processingEfficiency = totalVotes > 0 ? (processedStatsData.count / totalVotes) * 100 : 0;

      return {
        totalPending: pendingStats.count,
        totalProcessed: processedStatsData.count,
        oldestPendingAge: pendingStats.oldestVote 
          ? this.formatDuration(Date.now() - pendingStats.oldestVote.getTime())
          : undefined,
        newestPendingAge: pendingStats.newestVote
          ? this.formatDuration(Date.now() - pendingStats.newestVote.getTime())
          : undefined,
        averageProcessingTime: processedStatsData.avgProcessingTime
          ? this.formatDuration(processedStatsData.avgProcessingTime)
          : undefined,
        processingEfficiency: Math.round(processingEfficiency),
        averageBatchSize: 20, // Default/estimated
        gasOptimization: 75 // Estimated optimization percentage
      };
    } catch (error: any) {
      console.error('Get pending vote stats error:', error);
      throw createAppError(`Failed to get pending vote stats: ${error.message}`, 500, 'GET_STATS_FAILED');
    }
  }

  // ===== BATCHING OPERATIONS =====

  async getBatchingInfo(businessId: string): Promise<BatchingInfo> {
  try {
    const settings = await this.getBrandSettings(businessId);
    const batchThreshold = parseInt(process.env.VOTE_BATCH_THRESHOLD || '20');
    
    const pendingCount = await PendingVote.countDocuments({
      businessId,
      isProcessed: false
    });

    const lastProcessed = await PendingVote.findOne({
      businessId,
      isProcessed: true
    }).sort({ processedAt: -1 });

    const canProcessNow = pendingCount >= batchThreshold;
    const nextBatchSize = Math.min(pendingCount, batchThreshold);
    const estimatedGasCost = this.estimateBatchGasCost(nextBatchSize);

    let reasonCannotProcess;
    if (!canProcessNow) {
      reasonCannotProcess = `Need ${batchThreshold - pendingCount} more votes to reach batch threshold`;
    }

    // Now this should work correctly with the schema field
    const autoProcessEnabled = settings.votingSettings?.autoProcessEnabled || false;

    return {
      readyForBatch: pendingCount,
      batchThreshold,
      autoProcessEnabled,
      nextBatchSize,
      estimatedGasCost,
      lastProcessedAt: lastProcessed?.processedAt,
      canProcessNow,
      reasonCannotProcess,
      batchEfficiency: pendingCount > 0 ? Math.min((pendingCount / batchThreshold) * 100, 100) : 0,
      estimatedSavings: this.calculateBatchSavings(nextBatchSize),
      recommendedAction: this.getRecommendedAction(pendingCount, batchThreshold)
    };
  } catch (error: any) {
    console.error('Get batching info error:', error);
    throw createAppError(`Failed to get batching info: ${error.message}`, 500, 'GET_BATCHING_INFO_FAILED');
  }
};

  async getProposalBreakdown(businessId: string): Promise<ProposalBreakdown[]> {
    try {
      const breakdown = await PendingVote.aggregate([
        { $match: { businessId, isProcessed: false } },
        {
          $group: {
            _id: '$proposalId',
            pendingCount: { $sum: 1 },
            oldestVote: { $min: '$createdAt' },
            voteChoices: { $push: '$voteChoice' }
          }
        },
        { $sort: { pendingCount: -1 } }
      ]);

      return breakdown.map(proposal => {
        const voteDistribution = proposal.voteChoices.reduce((acc: any, choice: string) => {
          acc[choice] = (acc[choice] || 0) + 1;
          return acc;
        }, { for: 0, against: 0, abstain: 0 });

        return {
          proposalId: proposal._id,
          pendingCount: proposal.pendingCount,
          readyForBatch: proposal.pendingCount >= 5, // Mini-batch threshold
          oldestVoteAge: proposal.oldestVote 
            ? this.formatDuration(Date.now() - proposal.oldestVote.getTime())
            : undefined,
          voteDistribution
        };
      });
    } catch (error: any) {
      console.error('Get proposal breakdown error:', error);
      throw createAppError(`Failed to get proposal breakdown: ${error.message}`, 500, 'GET_PROPOSAL_BREAKDOWN_FAILED');
    }
  }

async processBatch(
  businessId: string, 
  options: BatchProcessingOptions
): Promise<BatchProcessingResult> {
  try {
    const batchId = this.generateBatchId();
    
    // Get votes to process
    let votesToProcess;
    if (options.voteIds && options.voteIds.length > 0) {
      votesToProcess = await PendingVote.find({
        businessId,
        voteId: { $in: options.voteIds },
        isProcessed: false
      });
    } else if (options.proposalId) {
      votesToProcess = await PendingVote.find({
        businessId,
        proposalId: options.proposalId,
        isProcessed: false
      }).sort({ createdAt: 1 });
    } else {
      // Process oldest votes first
      const batchSize = parseInt(process.env.VOTE_BATCH_SIZE || '50');
      votesToProcess = await PendingVote.find({
        businessId,
        isProcessed: false
      }).sort({ createdAt: 1 }).limit(batchSize);
    }

    if (votesToProcess.length === 0) {
      return {
        success: false,
        totalVotes: 0,
        processedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        error: 'No votes available for processing'
      };
    }

    // Validate votes before processing
    const validVotes = votesToProcess.filter(vote => this.validateVoteRecord(vote));
    const invalidVotes = votesToProcess.filter(vote => !this.validateVoteRecord(vote));

    if (validVotes.length === 0) {
      return {
        success: false,
        totalVotes: votesToProcess.length,
        processedCount: 0,
        failedCount: invalidVotes.length,
        skippedCount: 0,
        error: 'No valid votes to process',
        errors: invalidVotes.map(vote => `Vote ${vote.voteId}: ${this.getValidationErrors(vote).join(', ')}`)
      };
    }

    // Process batch through blockchain service - FIXED METHOD CALL AND PARAMETERS
    try {
      // Prepare data in the format expected by VotingService.batchSubmitVotes
      const proposalIds = validVotes.map(vote => vote.proposalId);
      const voteIds = validVotes.map(vote => vote.voteId);
      const signatures = validVotes.map(vote => vote.userSignature || '0x'); // Provide default if missing

      const result = await VotingService.batchSubmitVotes(
        options.contractAddress,
        proposalIds,
        voteIds,
        signatures
      );

      // Mark votes as processed
      const processedVoteIds = validVotes.map(vote => vote.voteId);
      await PendingVote.updateMany(
        { voteId: { $in: processedVoteIds } },
        { 
          isProcessed: true,
          processedAt: new Date()
        }
      );

      return {
        success: true,
        batchId,
        totalVotes: votesToProcess.length,
        processedCount: validVotes.length,
        failedCount: invalidVotes.length,
        skippedCount: 0,
        transactionHash: result.txHash,
        blockNumber: undefined, // BatchVoteResult doesn't include blockNumber
        gasUsed: undefined, // BatchVoteResult doesn't include gasUsed
        gasPrice: undefined, // BatchVoteResult doesn't include gasPrice
        totalCost: undefined, // BatchVoteResult doesn't include totalCost
        processedVotes: processedVoteIds,
        failedVotes: invalidVotes.map(vote => ({
          voteId: vote.voteId,
          error: this.getValidationErrors(vote).join(', ')
        }))
      };
    } catch (blockchainError: any) {
      console.error('Blockchain batch processing error:', blockchainError);
      
      return {
        success: false,
        batchId,
        totalVotes: votesToProcess.length,
        processedCount: 0,
        failedCount: votesToProcess.length,
        skippedCount: 0,
        error: `Blockchain processing failed: ${blockchainError.message}`,
        errors: [blockchainError.message]
      };
    }
  } catch (error: any) {
    console.error('Process batch error:', error);
    throw createAppError(`Failed to process batch: ${error.message}`, 500, 'PROCESS_BATCH_FAILED');
  }
};

  // ===== CONFIGURATION AND MANAGEMENT =====

  async updateBatchConfig(
    businessId: string,
    config: Partial<BatchConfig>
  ): Promise<BatchConfig> {
    try {
      const settings = await this.getBrandSettings(businessId);
      
      // Update settings with new configuration
      const updates: any = {};
      if (config.batchThreshold !== undefined) updates.voteBatchThreshold = config.batchThreshold;
      if (config.autoProcessEnabled !== undefined) updates.autoProcessVotes = config.autoProcessEnabled;
      if (config.maxBatchSize !== undefined) updates.maxVoteBatchSize = config.maxBatchSize;
      if (config.processingDelay !== undefined) updates.voteProcessingDelay = config.processingDelay;

      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { $set: updates },
        { upsert: true }
      );

      return {
        batchThreshold: config.batchThreshold || parseInt(process.env.VOTE_BATCH_THRESHOLD || '20'),
        autoProcessEnabled: config.autoProcessEnabled || false,
        maxBatchSize: config.maxBatchSize || parseInt(process.env.VOTE_BATCH_SIZE || '50'),
        processingDelay: config.processingDelay || 0,
        lastUpdatedAt: new Date()
      };
    } catch (error: any) {
      console.error('Update batch config error:', error);
      throw createAppError(`Failed to update batch config: ${error.message}`, 500, 'UPDATE_CONFIG_FAILED');
    }
  }

  async getBatchOptimizationRecommendations(businessId: string) {
    try {
      const stats = await this.getPendingVoteStats(businessId);
      const batchingInfo = await this.getBatchingInfo(businessId);
      
      // Calculate optimal settings based on usage patterns
      const suggestedThreshold = Math.max(10, Math.min(50, Math.ceil(stats.totalPending / 4)));
      const optimalBatchSize = Math.max(20, Math.min(100, suggestedThreshold * 2));
      
      return {
        suggestedThreshold,
        optimalBatchSize,
        costOptimization: 'Process votes in larger batches to reduce gas costs per vote',
        performanceOptimization: 'Enable auto-processing for faster vote confirmation',
        estimatedGasSavings: this.calculateBatchSavings(optimalBatchSize),
        processingTimeImprovement: '40-60% faster processing with optimal batch size',
        userExperienceImpact: 'Users will see votes confirmed faster with auto-processing'
      };
    } catch (error: any) {
      console.error('Get optimization recommendations error:', error);
      throw createAppError(`Failed to get recommendations: ${error.message}`, 500, 'GET_RECOMMENDATIONS_FAILED');
    }
  }

  // ===== VALIDATION AND UTILITY METHODS =====

 
async validatePendingVotes(
  businessId: string,
  options: { voteIds?: string[]; proposalId?: string } = {}
): Promise<ValidationResult> {
  try {
    const query: any = { businessId, isProcessed: false };
    if (options.voteIds) query.voteId = { $in: options.voteIds };
    if (options.proposalId) query.proposalId = options.proposalId;

    // Don't use .lean() to ensure virtuals are available
    const votes = await PendingVote.find(query);
    const eligible: string[] = [];
    const ineligibleVotes: ValidationResult['ineligibleVotes'] = []; // Fixed property name
    const warnings: string[] = [];

    votes.forEach(vote => {
      if (this.validateVoteRecord(vote)) {
        eligible.push(vote.voteId);
      } else {
        const errors = this.getValidationErrors(vote);
        ineligibleVotes.push({
          voteId: vote.voteId,
          reason: errors.join(', '),
          canFix: this.canFixVote(vote),
          recommendation: this.getFixRecommendation(vote)
        });
      }

      // Check for warnings - Fixed ageInMinutes access
      const ageInMinutes = Math.floor((Date.now() - vote.createdAt.getTime()) / (1000 * 60));
      if (ageInMinutes > 60) {
        warnings.push(`Vote ${vote.voteId} is over 1 hour old`);
      }
    });

    const canProcessBatch = eligible.length >= 5; // Minimum batch size
    const recommendedBatchSize = Math.min(eligible.length, 50);
    const estimatedGasCost = this.estimateBatchGasCost(recommendedBatchSize);

    const blockers: string[] = [];
    if (eligible.length === 0) blockers.push('No eligible votes to process');
    if (!canProcessBatch) blockers.push('Not enough votes for minimum batch size');

    return {
      totalValidated: votes.length,
      eligibleCount: eligible.length,
      ineligibleCount: ineligibleVotes.length, // Fixed property name
      warningCount: warnings.length,
      eligibleVotes: eligible,
      ineligibleVotes, // Fixed property name
      warnings,
      canProcessBatch,
      recommendedBatchSize,
      estimatedGasCost,
      blockers
    };
  } catch (error: any) {
    console.error('Validate pending votes error:', error);
    throw createAppError(`Failed to validate pending votes: ${error.message}`, 500, 'VALIDATION_FAILED');
  }
}

  async deletePendingVotes(
    businessId: string,
    voteIds: string[],
    reason?: string
  ): Promise<{ deletedCount: number }> {
    try {
      const result = await PendingVote.deleteMany({
        businessId,
        voteId: { $in: voteIds },
        isProcessed: false // Only delete unprocessed votes
      });

      // Log deletion for audit
      console.log(`Deleted ${result.deletedCount} pending votes for business ${businessId}. Reason: ${reason || 'No reason provided'}`);

      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      console.error('Delete pending votes error:', error);
      throw createAppError(`Failed to delete pending votes: ${error.message}`, 500, 'DELETE_FAILED');
    }
  }

  async getRelatedVotes(voteId: string, businessId: string): Promise<RelatedVotes> {
    try {
      const vote = await PendingVote.findOne({ _id: voteId, businessId });
      if (!vote) {
        return { sameProposal: 0, sameUser: 0, totalForProposal: 0 };
      }

      const [sameProposal, sameUser, totalForProposal] = await Promise.all([
        PendingVote.countDocuments({
          businessId,
          proposalId: vote.proposalId,
          _id: { $ne: voteId }
        }),
        PendingVote.countDocuments({
          businessId,
          userId: vote.userId,
          _id: { $ne: voteId }
        }),
        PendingVote.countDocuments({
          businessId,
          proposalId: vote.proposalId
        })
      ]);

      return { sameProposal, sameUser, totalForProposal };
    } catch (error: any) {
      console.error('Get related votes error:', error);
      return { sameProposal: 0, sameUser: 0, totalForProposal: 0 };
    }
  }

  async getProposalInfo(businessId: string, proposalId: string) {
    try {
      // This would typically fetch from a Proposal model or blockchain
      // For now, return basic info
      const voteCount = await PendingVote.countDocuments({ businessId, proposalId });
      
      return {
        proposalId,
        title: `Proposal ${proposalId}`,
        status: 'active',
        pendingVotes: voteCount,
        totalVotes: voteCount, // Would include processed votes
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };
    } catch (error: any) {
      console.error('Get proposal info error:', error);
      return null;
    }
  }

  async triggerAutoProcessing(businessId: string) {
    try {
      const batchingInfo = await this.getBatchingInfo(businessId);
      
      if (!batchingInfo.autoProcessEnabled) {
        return {
          triggered: false,
          reason: 'Auto-processing is disabled',
          autoProcessingEnabled: false
        };
      }

      if (!batchingInfo.canProcessNow) {
        return {
          triggered: false,
          reason: batchingInfo.reasonCannotProcess,
          autoProcessingEnabled: true,
          pendingVotesRemaining: batchingInfo.readyForBatch,
          nextAutoCheck: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        };
      }

      // Get voting contract
      const settings = await this.getBrandSettings(businessId);
      if (!settings.web3Settings?.voteContract) {
        return {
          triggered: false,
          reason: 'No voting contract deployed',
          autoProcessingEnabled: true
        };
      }

      // Trigger batch processing
      const result = await this.processBatch(businessId, {
        contractAddress: settings.web3Settings?.voteContract
      });

      return {
        triggered: result.success,
        reason: result.success ? 'Batch processed successfully' : result.error,
        processedBatches: result.success ? 1 : 0,
        pendingVotesRemaining: batchingInfo.readyForBatch - (result.processedCount || 0),
        nextAutoCheck: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        autoProcessingEnabled: true
      };
    } catch (error: any) {
      console.error('Trigger auto processing error:', error);
      return {
        triggered: false,
        reason: `Auto-processing failed: ${error.message}`,
        autoProcessingEnabled: true
      };
    }
  }

  // ===== PRIVATE VALIDATION HELPERS =====

  private validateVoteRecord(vote: any): boolean {
    // Basic validation checks
    if (!vote.proposalId || !vote.userId || !vote.voteChoice) return false;
    if (!['for', 'against', 'abstain'].includes(vote.voteChoice)) return false;
    if (vote.isProcessed) return false;
    
    // Age check (don't process votes older than 24 hours)
    const ageInHours = (Date.now() - vote.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) return false;
    
    return true;
  }

  private canProcessVote(vote: any): boolean {
    return this.validateVoteRecord(vote) && vote.isVerified;
  }

  private getValidationErrors(vote: any): string[] {
    const errors: string[] = [];
    
    if (!vote.proposalId) errors.push('Missing proposal ID');
    if (!vote.userId) errors.push('Missing user ID');
    if (!vote.voteChoice) errors.push('Missing vote choice');
    if (!['for', 'against', 'abstain'].includes(vote.voteChoice)) errors.push('Invalid vote choice');
    if (vote.isProcessed) errors.push('Vote already processed');
    if (!vote.isVerified) errors.push('Vote signature not verified');
    
    const ageInHours = (Date.now() - vote.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) errors.push('Vote too old (>24 hours)');
    
    return errors;
  }

  private isEligibleForBatch(vote: any): boolean {
    return this.validateVoteRecord(vote) && vote.isVerified;
  }

  private canFixVote(vote: any): boolean {
    const errors = this.getValidationErrors(vote);
    // Can fix if only missing verification or minor issues
    return errors.length === 1 && errors[0] === 'Vote signature not verified';
  }

  private getFixRecommendation(vote: any): string {
    const errors = this.getValidationErrors(vote);
    
    if (errors.includes('Vote signature not verified')) {
      return 'Re-verify the vote signature';
    }
    if (errors.includes('Vote too old (>24 hours)')) {
      return 'Vote expired, requires re-submission';
    }
    if (errors.includes('Vote already processed')) {
      return 'Vote is already processed, no action needed';
    }
    
    return 'Contact support for assistance';
  }

  private estimateVoteGasCost(): string {
    // Estimated gas cost per vote in ETH
    return '0.001';
  }

  private estimateBatchGasCost(batchSize: number): string {
    // Batch processing is more efficient
    const baseGas = 50000; // Base transaction gas
    const perVoteGas = 20000; // Gas per vote in batch
    const totalGas = baseGas + (perVoteGas * batchSize);
    
    // Assume 20 gwei gas price
    const gasPriceWei = 20 * 1000000000;
    const totalCostWei = totalGas * gasPriceWei;
    const totalCostEth = totalCostWei / 1000000000000000000;
    
    return totalCostEth.toFixed(6);
  }

  private calculateBatchSavings(batchSize: number): string {
    const individualCost = parseFloat(this.estimateVoteGasCost()) * batchSize;
    const batchCost = parseFloat(this.estimateBatchGasCost(batchSize));
    const savings = individualCost - batchCost;
    const savingsPercentage = (savings / individualCost) * 100;
    
    return `${savingsPercentage.toFixed(1)}% (${savings.toFixed(4)} ETH)`;
  }

  private getRecommendedAction(pendingCount: number, threshold: number): string {
    if (pendingCount === 0) return 'No pending votes';
    if (pendingCount >= threshold) return 'Process batch now';
    if (pendingCount >= threshold * 0.8) return 'Consider processing soon';
    if (pendingCount >= threshold * 0.5) return 'Monitor and wait for more votes';
    return 'Wait for more votes to accumulate';
  }
}