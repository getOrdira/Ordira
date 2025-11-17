import { createAppError } from '../../../middleware/core/error.middleware';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
import { VotingService as BlockchainVotingService } from '../../blockchain/voting.service';
import {
  createContractInfoCacheMetadata,
  VOTING_CACHE_TTL
} from '../utils/cache';
import type {
  ContractInfo,
  VotingContractVoteEvent,
  VotingProposalEvent
} from '../utils/types';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export class VotingContractService {
  private ensureContractAddress(contractAddress: string): string {
    const trimmed = (contractAddress || '').trim();
    if (!trimmed) {
      throw createAppError('Contract address is required', 400, 'MISSING_CONTRACT_ADDRESS');
    }

    if (!ETH_ADDRESS_REGEX.test(trimmed)) {
      throw createAppError('Invalid contract address format', 400, 'INVALID_CONTRACT_ADDRESS');
    }

    return trimmed;
  }

  async getContractInfo(contractAddress: string): Promise<ContractInfo> {
    const validated = this.ensureContractAddress(contractAddress);

    const cached = await enhancedCacheService.getCachedAnalytics(
      'voting',
      createContractInfoCacheMetadata(validated)
    );

    if (cached) {
      return cached as ContractInfo;
    }

    const contractInfo = await BlockchainVotingService.getContractInfo(validated);
    const info: ContractInfo = {
      totalProposals: contractInfo.totalProposals,
      totalVotes: contractInfo.totalVotes,
      activeProposals: contractInfo.activeProposals
    };

    await enhancedCacheService.cacheAnalytics(
      'voting',
      createContractInfoCacheMetadata(validated),
      info,
      { keyPrefix: 'ordira', ttl: VOTING_CACHE_TTL.contractInfo }
    );

    return info;
  }

  async getProposalEvents(contractAddress: string): Promise<VotingProposalEvent[]> {
    const validated = this.ensureContractAddress(contractAddress);
    return BlockchainVotingService.getProposalEvents(validated);
  }

  async getVoteEvents(contractAddress: string): Promise<VotingContractVoteEvent[]> {
    const validated = this.ensureContractAddress(contractAddress);
    return BlockchainVotingService.getVoteEvents(validated);
  }
}

export const votingContractService = new VotingContractService();

