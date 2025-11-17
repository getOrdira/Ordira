// src/services/votes/features/votingManagement.service.ts
// Management utilities for voting operations

import { createAppError } from '../../../middleware/core/error.middleware';
import { PendingVote } from '../../../models/voting/pendingVote.model';
import { logger } from '../../../utils/logger';
import { votingValidationService } from '../validation/votingValidation.service';

export class VotingManagementService {
  constructor(
    private readonly validation = votingValidationService
  ) {}

  /**
   * Get proposal information
   */
  async getProposalInfo(businessId: string, proposalId: string) {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const trimmedProposalId = proposalId.trim();
      
      if (!trimmedProposalId) {
        throw createAppError('Proposal ID is required', 400, 'MISSING_PROPOSAL_ID');
      }

      // This would typically fetch from a Proposal model or blockchain
      // For now, return basic info
      const voteCount = await PendingVote.countDocuments({ 
        businessId: validatedBusinessId, 
        proposalId: trimmedProposalId 
      });
      
      return {
        proposalId: trimmedProposalId,
        title: `Proposal ${trimmedProposalId}`,
        status: 'active',
        pendingVotes: voteCount,
        totalVotes: voteCount, // Would include processed votes
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };
    } catch (error: any) {
      logger.error('Get proposal info error:', error);
      return null;
    }
  }
}

export const votingManagementService = new VotingManagementService();

