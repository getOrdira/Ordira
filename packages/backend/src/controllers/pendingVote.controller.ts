// src/controllers/pendingVote.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { getPendingVoteService, getVotingService } from '../services/container.service';

// Initialize services via container
const pendingVoteService = getPendingVoteService();
const votingService = getVotingService();

/**
 * Extended request interfaces for type safety
 */
interface TenantVoteRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface PendingVoteListRequest extends TenantVoteRequest, ValidatedRequest {
  validatedQuery: {
    proposalId?: string;
    userId?: string;
    status?: 'pending' | 'processed' | 'all';
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'proposalId' | 'userId';
    sortOrder?: 'asc' | 'desc';
  };
}

interface BatchProcessRequest extends TenantVoteRequest, ValidatedRequest {
  validatedBody: {
    voteIds?: string[];
    proposalId?: string;
    forceProcess?: boolean;
    maxGasPrice?: string;
  };
}

interface BatchConfigRequest extends TenantVoteRequest, ValidatedRequest {
  validatedBody: {
    batchThreshold?: number;
    autoProcessEnabled?: boolean;
    maxBatchSize?: number;
    processingDelay?: number;
  };
}

/**
 * Get pending votes with advanced filtering
 * GET /api/pending-votes
 * 
 * @requires authentication & tenant context
 * @optional query: filtering, pagination, sorting
 * @returns { pendingVotes[], stats, batching }
 */
export const getPendingVotes = asyncHandler(async (
  req: PendingVoteListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract and validate query parameters
  const queryParams = req.validatedQuery || {};
  const page = queryParams.page || 1;
  const limit = Math.min(queryParams.limit || 50, 200); // Max 200 per page
  const offset = (page - 1) * limit;

  // Build comprehensive filter options
  const filterOptions = {
    proposalId: queryParams.proposalId,
    userId: queryParams.userId,
    includeProcessed: queryParams.status === 'all' || queryParams.status === 'processed',
    onlyProcessed: queryParams.status === 'processed',
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc',
    limit,
    offset
  };

  // Get pending votes and stats through service
  const [result, batchingInfo, votingStats] = await Promise.all([
    pendingVoteService.listPendingVotes(businessId, filterOptions),
    pendingVoteService.getBatchingInfo(businessId),
    votingService.getVotingStats(businessId)
  ]);

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Pending votes retrieved successfully',
    data: {
      pendingVotes: result.votes,
      stats: {
        total: result.total,
        pending: result.pending,
        processed: result.processed,
        readyForBatch: batchingInfo.readyForBatch,
        batchThreshold: batchingInfo.batchThreshold
      },
      batching: {
        autoProcessEnabled: batchingInfo.autoProcessEnabled,
        nextBatchSize: batchingInfo.nextBatchSize,
        estimatedGasCost: batchingInfo.estimatedGasCost,
        lastProcessedAt: batchingInfo.lastProcessedAt,
        canProcessNow: batchingInfo.canProcessNow
      },
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      },
      filters: {
        proposalId: queryParams.proposalId,
        userId: queryParams.userId,
        status: queryParams.status
      },
      context: {
        hasVotingContract: !!votingStats.contractAddress,
        contractAddress: votingStats.contractAddress
      }
    }
  });
});

/**
 * Get pending vote statistics and batching analytics
 * GET /api/pending-votes/stats
 * 
 * @requires authentication & tenant context
 * @returns { overview, batchAnalytics, proposalBreakdown }
 */
export const getPendingVoteStats = asyncHandler(async (
  req: TenantVoteRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get comprehensive statistics
  const [stats, batchingInfo, proposalBreakdown] = await Promise.all([
    pendingVoteService.getPendingVoteStats(businessId),
    pendingVoteService.getBatchingInfo(businessId),
    pendingVoteService.getProposalBreakdown(businessId)
  ]);

  // Return detailed statistics
  res.json({
    success: true,
    message: 'Pending vote statistics retrieved successfully',
    data: {
      overview: {
        totalPending: stats.totalPending,
        totalProcessed: stats.totalProcessed,
        oldestPendingAge: stats.oldestPendingAge,
        newestPendingAge: stats.newestPendingAge,
        averageProcessingTime: stats.averageProcessingTime
      },
      batchAnalytics: {
        readyForBatch: batchingInfo.readyForBatch,
        batchThreshold: batchingInfo.batchThreshold,
        batchEfficiency: batchingInfo.batchEfficiency,
        estimatedSavings: batchingInfo.estimatedSavings,
        recommendedAction: batchingInfo.recommendedAction
      },
      proposalBreakdown: proposalBreakdown.map(proposal => ({
        proposalId: proposal.proposalId,
        pendingCount: proposal.pendingCount,
        readyForBatch: proposal.readyForBatch,
        oldestVoteAge: proposal.oldestVoteAge,
        voteDistribution: proposal.voteDistribution
      })),
      performance: {
        processingEfficiency: stats.processingEfficiency,
        averageBatchSize: stats.averageBatchSize,
        gasOptimization: stats.gasOptimization
      },
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Process pending votes in batches
 * POST /api/pending-votes/process
 * 
 * @requires authentication & tenant context
 * @optional body: batch configuration and filters
 * @returns { processed, batchInfo, transaction }
 */
export const processPendingVotes = asyncHandler(async (
  req: BatchProcessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract processing options
  const {
    voteIds,
    proposalId,
    forceProcess = false,
    maxGasPrice
  } = req.validatedBody || {};

  // Check if business has voting contract
  const votingStats = await votingService.getVotingStats(businessId);
  if (!votingStats.contractAddress) {
    throw createAppError('No voting contract deployed for this business', 400, 'NO_VOTING_CONTRACT');
  }

  // Validate batch processing eligibility
  const batchingInfo = await pendingVoteService.getBatchingInfo(businessId);
  
  if (!forceProcess && !batchingInfo.canProcessNow) {
    throw createAppError(
      `Batch processing not ready. ${batchingInfo.reasonCannotProcess}`,
      400,
      'BATCH_NOT_READY'
    );
  }

  // Process the batch
  const processingOptions = {
    voteIds,
    proposalId,
    maxGasPrice,
    forceProcess,
    contractAddress: votingStats.contractAddress
  };

  const result = await pendingVoteService.processBatch(businessId, processingOptions);

  // Return comprehensive response
  res.status(result.success ? 200 : 400).json({
    success: result.success,
    message: result.success 
      ? `Successfully processed ${result.processedCount} votes in batch`
      : `Batch processing failed: ${result.error}`,
    data: {
      batch: {
        batchId: result.batchId,
        totalVotes: result.totalVotes,
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount
      },
      transaction: result.success ? {
        hash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        gasPrice: result.gasPrice,
        totalCost: result.totalCost
      } : null,
      details: {
        processedVotes: result.processedVotes || [],
        failedVotes: result.failedVotes || [],
        errors: result.errors || []
      },
      nextSteps: result.success ? [
        'Votes have been submitted to blockchain',
        'Monitor transaction confirmation',
        'Check for any remaining pending votes'
      ] : [
        'Review error messages',
        'Check contract status and gas settings',
        'Retry with corrected parameters'
      ]
    }
  });
});

/**
 * Get specific pending vote details
 * GET /api/pending-votes/:voteId
 * 
 * @requires authentication & tenant context
 * @requires params: { voteId: string }
 * @returns { vote, validation, processing }
 */
export const getPendingVoteDetails = asyncHandler(async (
  req: TenantVoteRequest & { params: { voteId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { voteId } = req.params;

  // Get vote details and related information
  const [vote, relatedVotes, proposalInfo] = await Promise.all([
    pendingVoteService.getPendingVoteById(voteId, businessId),
    pendingVoteService.getRelatedVotes(voteId, businessId),
    pendingVoteService.getProposalInfo(businessId, '') // Will be filled by vote.proposalId
  ]);

  if (!vote) {
    throw createAppError('Pending vote not found', 404, 'VOTE_NOT_FOUND');
  }

  // Get proposal-specific info
  const proposalDetails = await pendingVoteService.getProposalInfo(businessId, vote.proposalId);

  // Return detailed vote information
  res.json({
    success: true,
    message: 'Pending vote details retrieved successfully',
    data: {
      vote: {
        id: vote.id,
        proposalId: vote.proposalId,
        userId: vote.userId,
        selectedProductId: vote.selectedProductId,
        userSignature: vote.userSignature,
        createdAt: vote.createdAt,
        isProcessed: vote.isProcessed,
        processedAt: vote.processedAt,
      },
      validation: {
        isValid: vote.isValid,
        canProcess: vote.canProcess,
        validationErrors: vote.validationErrors || []
      },
      processing: {
        eligibleForBatch: vote.eligibleForBatch,
        estimatedGasCost: vote.estimatedGasCost,
        processingPriority: vote.processingPriority,
        estimatedConfirmationTime: vote.estimatedConfirmationTime
      },
      proposal: proposalDetails,
      relatedVotes: {
        sameProposal: relatedVotes.sameProposal,
        sameUser: relatedVotes.sameUser,
        totalForProposal: relatedVotes.totalForProposal
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Configure batch processing settings
 * PUT /api/pending-votes/config
 * 
 * @requires authentication & tenant context
 * @requires validation: batch configuration
 * @returns { config, updated, recommendations }
 */
export const updateBatchConfig = asyncHandler(async (
  req: BatchConfigRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract configuration updates
  const {
    batchThreshold,
    autoProcessEnabled,
    maxBatchSize,
    processingDelay
  } = req.validatedBody || {};

  // Validate configuration values
  if (batchThreshold !== undefined && (batchThreshold < 1 || batchThreshold > 1000)) {
    throw createAppError('Batch threshold must be between 1 and 1000', 400, 'INVALID_BATCH_THRESHOLD');
  }

  if (maxBatchSize !== undefined && (maxBatchSize < 1 || maxBatchSize > 500)) {
    throw createAppError('Max batch size must be between 1 and 500', 400, 'INVALID_MAX_BATCH_SIZE');
  }

  if (processingDelay !== undefined && (processingDelay < 0 || processingDelay > 3600)) {
    throw createAppError('Processing delay must be between 0 and 3600 seconds', 400, 'INVALID_PROCESSING_DELAY');
  }

  // Update configuration through service
  const updatedConfig = await pendingVoteService.updateBatchConfig(businessId, {
    batchThreshold,
    autoProcessEnabled,
    maxBatchSize,
    processingDelay
  });

  // Get optimization recommendations
  const recommendations = await pendingVoteService.getBatchOptimizationRecommendations(businessId);

  // Return configuration update response
  res.json({
    success: true,
    message: 'Batch configuration updated successfully',
    data: {
      config: {
        batchThreshold: updatedConfig.batchThreshold,
        autoProcessEnabled: updatedConfig.autoProcessEnabled,
        maxBatchSize: updatedConfig.maxBatchSize,
        processingDelay: updatedConfig.processingDelay,
        lastUpdatedAt: updatedConfig.lastUpdatedAt
      },
      recommendations: {
        suggestedThreshold: recommendations.suggestedThreshold,
        optimalBatchSize: recommendations.optimalBatchSize,
        costOptimization: recommendations.costOptimization,
        performanceOptimization: recommendations.performanceOptimization
      },
      impact: {
        estimatedGasSavings: recommendations.estimatedGasSavings,
        processingTimeImprovement: recommendations.processingTimeImprovement,
        userExperienceImpact: recommendations.userExperienceImpact
      },
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete/cancel pending votes (before processing)
 * DELETE /api/pending-votes
 * 
 * @requires authentication & tenant context
 * @requires validation: vote IDs to delete
 * @returns { deleted, summary }
 */
export const deletePendingVotes = asyncHandler(async (
  req: TenantVoteRequest & {
    validatedBody: { voteIds: string[]; reason?: string }
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { voteIds, reason } = req.validatedBody;

  if (!voteIds || voteIds.length === 0) {
    throw createAppError('At least one vote ID is required', 400, 'MISSING_VOTE_IDS');
  }

  if (voteIds.length > 100) {
    throw createAppError('Maximum 100 votes can be deleted at once', 400, 'TOO_MANY_VOTES');
  }

  // Delete pending votes through service
  const result = await pendingVoteService.deletePendingVotes(businessId, voteIds, reason);

  // Return deletion summary
  res.json({
    success: true,
    message: `${result.deletedCount} pending votes deleted successfully`,
    data: {
      requested: voteIds.length,
      deleted: result.deletedCount,
      notFound: voteIds.length - result.deletedCount,
      reason: reason || 'No reason provided',
      deletedAt: new Date().toISOString()
    }
  });
});

/**
 * Validate pending votes before processing
 * POST /api/pending-votes/validate
 * 
 * @requires authentication & tenant context
 * @optional body: vote IDs to validate (default: all pending)
 * @returns { validation, eligible, ineligible, recommendations }
 */
export const validatePendingVotes = asyncHandler(async (
  req: TenantVoteRequest & {
    validatedBody?: { voteIds?: string[]; proposalId?: string }
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { voteIds, proposalId } = req.validatedBody || {};

  // Validate pending votes through service
  const validation = await pendingVoteService.validatePendingVotes(businessId, {
    voteIds,
    proposalId
  });

  // Return comprehensive validation results
  res.json({
    success: true,
    message: 'Pending vote validation completed',
    data: {
      summary: {
        totalValidated: validation.totalValidated,
        eligible: validation.eligibleCount,
        ineligible: validation.ineligibleCount,
        warnings: validation.warningCount
      },
      validation: {
        eligible: validation.eligibleVotes,
        ineligible: validation.ineligibleVotes.map(vote => ({
          voteId: vote.voteId,
          reason: vote.reason,
          canFix: vote.canFix,
          recommendation: vote.recommendation
        })),
        warnings: validation.warnings
      },
      batchReadiness: {
        canProcessBatch: validation.canProcessBatch,
        recommendedBatchSize: validation.recommendedBatchSize,
        estimatedGasCost: validation.estimatedGasCost,
        blockers: validation.blockers
      },
      validatedAt: new Date().toISOString()
    }
  });
});

/**
 * Trigger automatic batch processing check
 * POST /api/pending-votes/auto-process
 * 
 * @requires authentication & tenant context
 * @returns { triggered, result, nextCheck }
 */
export const triggerAutoProcess = asyncHandler(async (
  req: TenantVoteRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Trigger auto-processing check
  const result = await pendingVoteService.triggerAutoProcessing(businessId);

  // Return processing result
  res.json({
    success: true,
    message: result.triggered 
      ? 'Auto-processing triggered successfully'
      : 'Auto-processing not triggered',
    data: {
      triggered: result.triggered,
      reason: result.reason,
      processedBatches: result.processedBatches || 0,
      pendingVotesRemaining: result.pendingVotesRemaining || 0,
      nextAutoCheck: result.nextAutoCheck,
      autoProcessingEnabled: result.autoProcessingEnabled,
      triggeredAt: new Date().toISOString()
    }
  });
});
