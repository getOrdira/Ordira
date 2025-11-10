// src/lib/api/features/votes/votesContract.api.ts
// Voting contract API aligned with backend routes/features/votes/votesContract.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ContractInfo,
  VotingContractVoteEvent,
  VotingProposalEvent
} from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeString } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/contract';

type HttpMethod = 'GET';

const createVotesContractLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'contract',
  method,
  endpoint,
  ...context
});

const sanitizeContractAddress = (contractAddress: string): string => {
  return sanitizeString(contractAddress, 'contractAddress', {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    trim: true
  });
};

export interface ContractInfoResponse {
  contractAddress: string;
  info: ContractInfo;
}

export interface ContractEventsResponse<TEvent> {
  contractAddress: string;
  events: TEvent[];
}

export const votesContractApi = {
  /**
   * Retrieve on-chain contract info.
   * GET /api/votes/contract/info
   */
  async getContractInfo(contractAddress: string): Promise<ContractInfoResponse> {
    const sanitizedAddress = sanitizeContractAddress(contractAddress);
    const endpoint = `${BASE_PATH}/info`;
    const params = baseApi.sanitizeQueryParams({ contractAddress: sanitizedAddress });

    try {
      const response = await api.get<ApiResponse<ContractInfoResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting contract info', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesContractLogContext('GET', endpoint, { contractAddress: sanitizedAddress })
      );
    }
  },

  /**
   * Retrieve proposal events emitted by the voting contract.
   * GET /api/votes/contract/proposal-events
   */
  async getProposalEvents(contractAddress: string): Promise<ContractEventsResponse<VotingProposalEvent>> {
    const sanitizedAddress = sanitizeContractAddress(contractAddress);
    const endpoint = `${BASE_PATH}/proposal-events`;
    const params = baseApi.sanitizeQueryParams({ contractAddress: sanitizedAddress });

    try {
      const response = await api.get<ApiResponse<ContractEventsResponse<VotingProposalEvent>>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to fetch voting proposal events', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesContractLogContext('GET', endpoint, { contractAddress: sanitizedAddress })
      );
    }
  },

  /**
   * Retrieve vote events emitted by the voting contract.
   * GET /api/votes/contract/vote-events
   */
  async getVoteEvents(contractAddress: string): Promise<ContractEventsResponse<VotingContractVoteEvent>> {
    const sanitizedAddress = sanitizeContractAddress(contractAddress);
    const endpoint = `${BASE_PATH}/vote-events`;
    const params = baseApi.sanitizeQueryParams({ contractAddress: sanitizedAddress });

    try {
      const response = await api.get<ApiResponse<ContractEventsResponse<VotingContractVoteEvent>>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to fetch voting contract vote events', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesContractLogContext('GET', endpoint, { contractAddress: sanitizedAddress })
      );
    }
  }
};

export default votesContractApi;
