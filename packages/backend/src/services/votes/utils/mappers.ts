import type { VoteRecord, PendingVoteRecord } from './types';
import type { IPendingVote } from '../../../models/voting/pendingVote.model';
import { calculateProcessingPriority, estimateVoteGasCost } from './pendingVoteHelpers';

type VotingRecordLike = {
  voterAddress?: string;
  voteId?: string;
  proposalId: string;
  transactionHash?: string;
  timestamp?: Date;
  blockNumber?: number;
  selectedProductId: string;
  productName?: string;
  gasUsed?: string;
};

type PendingVoteLike = {
  businessId: string;
  proposalId: string;
  userId: string;
  voteId: string;
  selectedProductId: string;
  productName?: string;
  productImageUrl?: string;
  selectionReason?: string;
  createdAt: Date;
};

export const mapVotingRecord = (record: VotingRecordLike): VoteRecord => ({
  voter: record.voterAddress || record.voteId || 'unknown',
  proposalId: record.proposalId,
  txHash: record.transactionHash || '',
  createdAt: record.timestamp,
  blockNumber: record.blockNumber,
  selectedProductId: record.selectedProductId,
  productName: record.productName,
  voterAddress: record.voterAddress,
  gasUsed: record.gasUsed
});

export const mapPendingVote = (vote: PendingVoteLike): PendingVoteRecord => ({
  businessId: vote.businessId,
  proposalId: vote.proposalId,
  userId: vote.userId,
  voteId: vote.voteId,
  selectedProductId: vote.selectedProductId,
  productName: vote.productName,
  productImageUrl: vote.productImageUrl,
  selectionReason: vote.selectionReason,
  createdAt: vote.createdAt
});

/**
 * Map pending vote with enhanced validation fields
 * Requires validation service to be passed in for validation checks
 */
export const mapPendingVoteEnhanced = (
  vote: IPendingVote | any,
  validationService?: {
    validateVoteRecord: (vote: any) => boolean;
    canProcessVote: (vote: any) => boolean;
    getValidationErrors: (vote: any) => string[];
    isEligibleForBatch: (vote: any) => boolean;
  }
): PendingVoteRecord => {
  const base = mapPendingVote({
    businessId: vote.businessId,
    proposalId: vote.proposalId,
    userId: vote.userId,
    voteId: vote.voteId,
    selectedProductId: vote.selectedProductId,
    productName: vote.productName,
    productImageUrl: vote.productImageUrl,
    selectionReason: vote.selectionReason,
    createdAt: vote.createdAt
  });

  // Add enhanced fields if validation service is provided
  if (validationService) {
    return {
      ...base,
      id: vote._id?.toString() || vote.id,
      userSignature: vote.userSignature,
      isProcessed: vote.isProcessed,
      processedAt: vote.processedAt,
      isValid: validationService.validateVoteRecord(vote),
      canProcess: validationService.canProcessVote(vote),
      validationErrors: validationService.getValidationErrors(vote),
      eligibleForBatch: validationService.isEligibleForBatch(vote),
      estimatedGasCost: estimateVoteGasCost(),
      processingPriority: calculateProcessingPriority(vote),
      estimatedConfirmationTime: '2-5 minutes'
    };
  }

  // Return base mapping without enhanced fields
  return {
    ...base,
    id: vote._id?.toString() || vote.id,
    userSignature: vote.userSignature,
    isProcessed: vote.isProcessed,
    processedAt: vote.processedAt
  };
};
