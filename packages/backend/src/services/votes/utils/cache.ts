export const VOTING_CACHE_TTL = {
  votingStats: 3 * 60 * 1000,
  votingAnalytics: 5 * 60 * 1000,
  businessVotes: 3 * 60 * 1000,
  proposalDetails: 5 * 60 * 1000,
  pendingVotes: 60 * 1000,
  contractInfo: 10 * 60 * 1000
} as const;

export const createAnalyticsCacheMetadata = (
  businessId: string,
  options: Record<string, unknown>
) => ({
  businessId,
  type: 'comprehensive-analytics' as const,
  options
});

export const createStatsCacheMetadata = (businessId: string) => ({
  businessId,
  type: 'voting-stats' as const
});

export const createBusinessVotesCacheMetadata = (businessId: string) => ({
  businessId,
  type: 'business-votes' as const
});

export const createPendingVotesCacheMetadata = (businessId: string) => ({
  businessId,
  type: 'pending-votes' as const
});

export const createBusinessProposalsCacheMetadata = (businessId: string) => ({
  businessId,
  type: 'business-proposals' as const
});

export const createContractInfoCacheMetadata = (contractAddress: string) => ({
  type: 'contract-info' as const,
  contractAddress
});

export const getVotingCacheTags = (businessId: string) => [
  `voting-analytics:${businessId}`,
  `voting-stats:${businessId}`,
  `business-votes:${businessId}`,
  `pending-votes:${businessId}`,
  `business-proposals:${businessId}`
];
