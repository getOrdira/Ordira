import type { VoteRecord, PendingVoteRecord } from './types';

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
