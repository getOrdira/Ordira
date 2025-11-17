import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
import { votingContractService } from '../core/votingContract.service';
import { votingDataService } from '../core/votingData.service';
import {
  createBusinessProposalsCacheMetadata,
  VOTING_CACHE_TTL
} from '../utils/cache';
import type { BusinessProposalsOptions, ProposalDetails } from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';

export class VotingProposalsService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly contractService = votingContractService
  ) {}

  async getBusinessProposals(businessId: string, options: BusinessProposalsOptions = {}): Promise<ProposalDetails[]> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);
    const normalizedOptions = votingValidationService.normalizeBusinessProposalsOptions(options);
    const { searchQuery, status, limit, useCache } = normalizedOptions;

    const simpleQuery = !searchQuery && !status;

    if (useCache && simpleQuery) {
      const cached = await enhancedCacheService.getCachedAnalytics('voting', createBusinessProposalsCacheMetadata(validatedBusinessId));
      if (cached) {
        logger.debug('Business proposals cache hit', {
          businessId: validatedBusinessId,
          count: cached.length
        });
        return (cached as ProposalDetails[]).slice(0, limit);
      }
    }

    const contractAddress = await this.dataService.getVoteContractAddress(validatedBusinessId);
    if (!contractAddress) {
      return [];
    }

    const proposalEvents = await this.contractService.getProposalEvents(contractAddress);

    let proposals: ProposalDetails[] = proposalEvents.map((event) => ({
      proposalId: event.proposalId,
      description: event.description,
      status: 'active',
      createdAt: new Date(),
      txHash: event.txHash,
      voteCount: 0,
      category: 'general',
      duration: 7 * 24 * 60 * 60
    }));

    if (status) {
      proposals = proposals.filter((proposal) => proposal.status === status);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const searchTerms = lowerQuery.split(' ');
      proposals = proposals.filter((proposal) =>
        searchTerms.some((term) =>
          proposal.description.toLowerCase().includes(term) ||
          (proposal.category || '').toLowerCase().includes(term)
        )
      );
    }

    proposals = proposals.slice(0, limit);

    if (useCache && simpleQuery) {
      await enhancedCacheService.cacheAnalytics(
        'voting',
        createBusinessProposalsCacheMetadata(validatedBusinessId),
        proposals,
        { keyPrefix: 'ordira', ttl: VOTING_CACHE_TTL.proposalDetails }
      );
    }

    logger.debug('Business proposals retrieved successfully', {
      businessId: validatedBusinessId,
      count: proposals.length,
      hasSearch: !!searchQuery
    });

    return proposals;
  }
}

export const votingProposalsService = new VotingProposalsService();
