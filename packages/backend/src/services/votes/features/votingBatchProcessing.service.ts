// src/services/votes/features/votingBatchProcessing.service.ts
// Batch processing service for pending votes

import { createAppError } from '../../../middleware/core/error.middleware';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { PendingVote } from '../../../models/voting/pendingVote.model';
import { logger } from '../../../utils/logger';
import { VotingService } from '../../blockchain/voting.service';
import { votingDataService } from '../core/votingData.service';
import { votingRecordValidationService } from './votingRecordValidation.service';
import type {
  BatchConfig,
  BatchProcessingOptions,
  BatchProcessingResult,
  BatchingInfo,
  PendingVoteStats
} from '../utils/types';
import {
  calculateBatchSavings,
  estimateBatchGasCost,
  generateBatchId,
  getRecommendedAction
} from '../utils/pendingVoteHelpers';
import { votingValidationService } from '../validation/votingValidation.service';

export class VotingBatchProcessingService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly validationService = votingRecordValidationService,
    private readonly validation = votingValidationService
  ) {}

  private async getBrandSettings(businessId: string) {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const settings = await BrandSettings.findOne({ business: validatedBusinessId });
    if (!settings) {
      throw createAppError('Brand settings not found', 404, 'BRAND_SETTINGS_NOT_FOUND');
    }
    return settings;
  }

  async getBatchingInfo(businessId: string): Promise<BatchingInfo> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const settings = await this.getBrandSettings(validatedBusinessId);
      const batchThreshold = parseInt(process.env.VOTE_BATCH_THRESHOLD || '20');
      
      const pendingCount = await PendingVote.countDocuments({
        businessId: validatedBusinessId,
        isProcessed: false
      });

      const lastProcessed = await PendingVote.findOne({
        businessId: validatedBusinessId,
        isProcessed: true
      }).sort({ processedAt: -1 });

      const canProcessNow = pendingCount >= batchThreshold;
      const nextBatchSize = Math.min(pendingCount, batchThreshold);
      const estimatedGasCost = estimateBatchGasCost(nextBatchSize);

      let reasonCannotProcess;
      if (!canProcessNow) {
        reasonCannotProcess = `Need ${batchThreshold - pendingCount} more votes to reach batch threshold`;
      }

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
        estimatedSavings: calculateBatchSavings(nextBatchSize),
        recommendedAction: getRecommendedAction(pendingCount, batchThreshold)
      };
    } catch (error: any) {
      logger.error('Get batching info error:', error);
      throw createAppError(`Failed to get batching info: ${error.message}`, 500, 'GET_BATCHING_INFO_FAILED');
    }
  }

  async processBatch(
    businessId: string, 
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const batchId = generateBatchId();
      
      // Get votes to process
      let votesToProcess;
      if (options.voteIds && options.voteIds.length > 0) {
        votesToProcess = await PendingVote.find({
          businessId: validatedBusinessId,
          voteId: { $in: options.voteIds },
          isProcessed: false
        });
      } else if (options.proposalId) {
        votesToProcess = await PendingVote.find({
          businessId: validatedBusinessId,
          proposalId: options.proposalId,
          isProcessed: false
        }).sort({ createdAt: 1 });
      } else {
        // Process oldest votes first
        const batchSize = parseInt(process.env.VOTE_BATCH_SIZE || '50');
        votesToProcess = await PendingVote.find({
          businessId: validatedBusinessId,
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
      const validVotes = votesToProcess.filter(vote => this.validationService.validateVoteRecord(vote));
      const invalidVotes = votesToProcess.filter(vote => !this.validationService.validateVoteRecord(vote));

      if (validVotes.length === 0) {
        return {
          success: false,
          totalVotes: votesToProcess.length,
          processedCount: 0,
          failedCount: invalidVotes.length,
          skippedCount: 0,
          error: 'No valid votes to process',
          errors: invalidVotes.map(vote => `Vote ${vote.voteId}: ${this.validationService.getValidationErrors(vote).join(', ')}`)
        };
      }

      // Process batch through blockchain service
      try {
        // Prepare data in the format expected by VotingService.batchSubmitVotes
        // Note: batchSubmitVotes expects selectedProposalsArray as 2D array
        const selectedProposalsArray = validVotes.map(vote => [vote.proposalId]);
        const voteIds = validVotes.map(vote => vote.voteId);
        const voterEmails = validVotes.map(vote => vote.voterEmail);
        const signatures = validVotes.map(vote => vote.userSignature || '0x'); // Provide default if missing

        const result = await VotingService.batchSubmitVotes(
          options.contractAddress,
          selectedProposalsArray,
          voteIds,
          voterEmails,
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
            error: this.validationService.getValidationErrors(vote).join(', ')
          }))
        };
      } catch (blockchainError: any) {
        logger.error('Blockchain batch processing error:', blockchainError);
        
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
      logger.error('Process batch error:', error);
      throw createAppError(`Failed to process batch: ${error.message}`, 500, 'PROCESS_BATCH_FAILED');
    }
  }

  async updateBatchConfig(
    businessId: string,
    config: Partial<BatchConfig>
  ): Promise<BatchConfig> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const settings = await this.getBrandSettings(validatedBusinessId);
      
      // Update settings with new configuration
      const updates: any = {};
      if (config.batchThreshold !== undefined) updates.voteBatchThreshold = config.batchThreshold;
      if (config.autoProcessEnabled !== undefined) updates.autoProcessVotes = config.autoProcessEnabled;
      if (config.maxBatchSize !== undefined) updates.maxVoteBatchSize = config.maxBatchSize;
      if (config.processingDelay !== undefined) updates.voteProcessingDelay = config.processingDelay;

      await BrandSettings.findOneAndUpdate(
        { business: validatedBusinessId },
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
      logger.error('Update batch config error:', error);
      throw createAppError(`Failed to update batch config: ${error.message}`, 500, 'UPDATE_CONFIG_FAILED');
    }
  }

  async getBatchOptimizationRecommendations(businessId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const stats = await this.dataService.getPendingVoteStats(validatedBusinessId);
      const batchingInfo = await this.getBatchingInfo(validatedBusinessId);
      
      // Calculate optimal settings based on usage patterns
      const suggestedThreshold = Math.max(10, Math.min(50, Math.ceil(stats.totalPending / 4)));
      const optimalBatchSize = Math.max(20, Math.min(100, suggestedThreshold * 2));
      
      return {
        suggestedThreshold,
        optimalBatchSize,
        costOptimization: 'Process votes in larger batches to reduce gas costs per vote',
        performanceOptimization: 'Enable auto-processing for faster vote confirmation',
        estimatedGasSavings: calculateBatchSavings(optimalBatchSize),
        processingTimeImprovement: '40-60% faster processing with optimal batch size',
        userExperienceImpact: 'Users will see votes confirmed faster with auto-processing'
      };
    } catch (error: any) {
      logger.error('Get optimization recommendations error:', error);
      throw createAppError(`Failed to get recommendations: ${error.message}`, 500, 'GET_RECOMMENDATIONS_FAILED');
    }
  }

  async triggerAutoProcessing(businessId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const batchingInfo = await this.getBatchingInfo(validatedBusinessId);
      
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
      const settings = await this.getBrandSettings(validatedBusinessId);
      if (!settings.web3Settings?.voteContract) {
        return {
          triggered: false,
          reason: 'No voting contract deployed',
          autoProcessingEnabled: true
        };
      }

      // Trigger batch processing
      const result = await this.processBatch(validatedBusinessId, {
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
      logger.error('Trigger auto processing error:', error);
      return {
        triggered: false,
        reason: `Auto-processing failed: ${error.message}`,
        autoProcessingEnabled: true
      };
    }
  }
}

export const votingBatchProcessingService = new VotingBatchProcessingService();

