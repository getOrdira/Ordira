// src/services/votes/features/votingRecordValidation.service.ts
// Validation service for pending vote records

import { createAppError } from '../../../middleware/core/error.middleware';
import { PendingVote, IPendingVote } from '../../../models/voting/pendingVote.model';
import { logger } from '../../../utils/logger';
import type { ValidationResult } from '../utils/types';
import { estimateBatchGasCost, estimateVoteGasCost } from '../utils/pendingVoteHelpers';

export class VotingRecordValidationService {
  /**
   * Validate a single vote record
   */
  validateVoteRecord(vote: any): boolean {
    // Basic validation checks
    if (!vote.proposalId || !vote.userId || !vote.voteChoice) return false;
    if (!['for', 'against', 'abstain'].includes(vote.voteChoice)) return false;
    if (vote.isProcessed) return false;
    
    // Age check (don't process votes older than 24 hours)
    const ageInHours = (Date.now() - vote.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) return false;
    
    return true;
  }

  /**
   * Check if a vote can be processed
   */
  canProcessVote(vote: any): boolean {
    return this.validateVoteRecord(vote) && vote.isVerified;
  }

  /**
   * Get validation errors for a vote
   */
  getValidationErrors(vote: any): string[] {
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

  /**
   * Check if a vote is eligible for batch processing
   */
  isEligibleForBatch(vote: any): boolean {
    return this.validateVoteRecord(vote) && vote.isVerified;
  }

  /**
   * Check if a vote can be fixed
   */
  canFixVote(vote: any): boolean {
    const errors = this.getValidationErrors(vote);
    // Can fix if only missing verification or minor issues
    return errors.length === 1 && errors[0] === 'Vote signature not verified';
  }

  /**
   * Get fix recommendation for a vote
   */
  getFixRecommendation(vote: any): string {
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

  /**
   * Validate multiple pending votes and return comprehensive results
   */
  async validatePendingVotes(
    businessId: string,
    options: { voteIds?: string[]; proposalId?: string } = {}
  ): Promise<ValidationResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const query: any = { businessId, isProcessed: false };
      if (options.voteIds) query.voteId = { $in: options.voteIds };
      if (options.proposalId) query.proposalId = options.proposalId;

      // Don't use .lean() to ensure virtuals are available
      const votes = await PendingVote.find(query);
      const eligible: string[] = [];
      const ineligibleVotes: ValidationResult['ineligibleVotes'] = [];
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

        // Check for warnings - age check
        const ageInMinutes = Math.floor((Date.now() - vote.createdAt.getTime()) / (1000 * 60));
        if (ageInMinutes > 60) {
          warnings.push(`Vote ${vote.voteId} is over 1 hour old`);
        }
      });

      const canProcessBatch = eligible.length >= 5; // Minimum batch size
      const recommendedBatchSize = Math.min(eligible.length, 50);
      const estimatedGasCost = estimateBatchGasCost(recommendedBatchSize);

      const blockers: string[] = [];
      if (eligible.length === 0) blockers.push('No eligible votes to process');
      if (!canProcessBatch) blockers.push('Not enough votes for minimum batch size');

      return {
        totalValidated: votes.length,
        eligibleCount: eligible.length,
        ineligibleCount: ineligibleVotes.length,
        warningCount: warnings.length,
        eligibleVotes: eligible,
        ineligibleVotes,
        warnings,
        canProcessBatch,
        recommendedBatchSize,
        estimatedGasCost,
        blockers
      };
    } catch (error: any) {
      logger.error('Validate pending votes error:', error);
      throw createAppError(`Failed to validate pending votes: ${error.message}`, 500, 'VALIDATION_FAILED');
    }
  }
}

export const votingRecordValidationService = new VotingRecordValidationService();

