// src/lib/api/features/votes/votesDeployment.api.ts
// Voting contract deployment API aligned with backend routes/features/votes/votesDeployment.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { DeployContractResult } from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeObjectId, sanitizeOptionalNumber, sanitizeString } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/deployment';

type HttpMethod = 'GET' | 'POST' | 'PUT';

const createVotesDeploymentLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'deployment',
  method,
  endpoint,
  ...context
});

export interface VotingContractSettingsInput {
  votingDelay?: number;
  votingPeriod?: number;
  quorumPercentage?: number;
}

export interface DeployVotingContractPayload extends VotingContractSettingsInput {
  businessId: string;
}

export interface DeployVotingContractResponse {
  businessId: string;
  deployment: DeployContractResult;
}

export interface VotingContractAddressResponse {
  businessId: string;
  contractAddress: string | null;
}

export interface VerifyVotingContractResponse {
  businessId: string;
  exists: boolean;
}

export interface ContractDeploymentInfoResponse {
  businessId: string;
  info: {
    contractAddress?: string;
    isDeployed: boolean;
    deployedAt?: string;
  };
}

export interface UpdateContractSettingsPayload extends VotingContractSettingsInput {
  businessId: string;
  contractAddress: string;
}

export interface UpdateContractSettingsResponse {
  businessId: string;
  contractAddress: string;
  updated: boolean;
  updatedAt: string;
}

const sanitizeSettings = (settings?: VotingContractSettingsInput) => {
  if (!settings) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    votingDelay: sanitizeOptionalNumber(settings.votingDelay, 'votingDelay', { integer: true, min: 0 }),
    votingPeriod: sanitizeOptionalNumber(settings.votingPeriod, 'votingPeriod', { integer: true, min: 1 }),
    quorumPercentage: sanitizeOptionalNumber(settings.quorumPercentage, 'quorumPercentage', {
      integer: true,
      min: 0,
      max: 100
    })
  });
};

export const votesDeploymentApi = {
  /**
   * Deploy a new voting contract for a business.
   * POST /api/votes/deployment/deploy
   */
  async deployVotingContract(payload: DeployVotingContractPayload): Promise<DeployVotingContractResponse> {
    const endpoint = `${BASE_PATH}/deploy`;
    const businessId = sanitizeObjectId(payload.businessId, 'businessId');
    const sanitizedSettings = sanitizeSettings(payload);

    const body = baseApi.sanitizeRequestData({
      businessId,
      ...sanitizedSettings
    });

    try {
      const response = await api.post<ApiResponse<DeployVotingContractResponse>>(endpoint, body);
      return baseApi.handleResponse(response, 'Failed to deploy voting contract', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDeploymentLogContext('POST', endpoint, {
          businessId,
          hasSettings: Boolean(sanitizedSettings && Object.keys(sanitizedSettings).length > 0)
        })
      );
    }
  },

  /**
   * Retrieve the voting contract address for a business.
   * GET /api/votes/deployment/contract-address
   */
  async getVotingContractAddress(businessId: string): Promise<VotingContractAddressResponse> {
    const endpoint = `${BASE_PATH}/contract-address`;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const params = baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId });

    try {
      const response = await api.get<ApiResponse<VotingContractAddressResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting contract address', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDeploymentLogContext('GET', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  },

  /**
   * Verify whether a business has a deployed voting contract.
   * GET /api/votes/deployment/verify
   */
  async verifyVotingContract(businessId: string): Promise<VerifyVotingContractResponse> {
    const endpoint = `${BASE_PATH}/verify`;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const params = baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId });

    try {
      const response = await api.get<ApiResponse<VerifyVotingContractResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to verify voting contract', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDeploymentLogContext('GET', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  },

  /**
   * Retrieve contract deployment info for a business.
   * GET /api/votes/deployment/deployment-info
   */
  async getContractDeploymentInfo(businessId: string): Promise<ContractDeploymentInfoResponse> {
    const endpoint = `${BASE_PATH}/deployment-info`;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const params = baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId });

    try {
      const response = await api.get<ApiResponse<ContractDeploymentInfoResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting contract deployment info', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDeploymentLogContext('GET', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  },

  /**
   * Update stored voting contract settings (metadata only).
   * PUT /api/votes/deployment/settings
   */
  async updateContractSettings(
    payload: UpdateContractSettingsPayload
  ): Promise<UpdateContractSettingsResponse> {
    const endpoint = `${BASE_PATH}/settings`;
    const businessId = sanitizeObjectId(payload.businessId, 'businessId');
    const contractAddress = sanitizeString(payload.contractAddress, 'contractAddress', {
      pattern: /^0x[a-fA-F0-9]{40}$/,
      trim: true
    });

    const sanitizedSettings = sanitizeSettings(payload);

    const body = baseApi.sanitizeRequestData({
      contractAddress,
      ...sanitizedSettings
    });

    const params = baseApi.sanitizeQueryParams({ businessId, contractAddress });

    try {
      const response = await api.put<ApiResponse<UpdateContractSettingsResponse>>(endpoint, body, { params });
      return baseApi.handleResponse(response, 'Failed to update voting contract settings', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDeploymentLogContext('PUT', endpoint, {
          businessId,
          contractAddress,
          hasSettings: Boolean(sanitizedSettings && Object.keys(sanitizedSettings).length > 0)
        })
      );
    }
  }
};

export default votesDeploymentApi;
