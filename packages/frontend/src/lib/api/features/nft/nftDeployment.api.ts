// src/lib/api/features/nft/nftDeployment.api.ts
// NFT deployment API aligned with backend routes/features/nft/nftDeployment.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  NftDeployContractParams,
  NftDeploymentResult
} from '@/lib/types/features/nft';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/nfts';

type HttpMethod = 'POST';

const createNftDeploymentLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'nfts',
  module: 'deployment',
  method,
  endpoint,
  ...context
});

const sanitizeDeploymentPayload = (payload: NftDeployContractParams) => {
  const sanitized = {
    name: sanitizeString(payload.name, 'name', {
      minLength: 1,
      maxLength: 100,
      trim: true
    }),
    symbol: sanitizeString(payload.symbol, 'symbol', {
      minLength: 1,
      maxLength: 20,
      trim: true,
      toUpperCase: true
    }),
    baseUri: sanitizeUrl(payload.baseUri, 'baseUri'),
    description: sanitizeOptionalString(payload.description, 'description', {
      maxLength: 1000,
      trim: true
    }),
    royaltyPercentage: sanitizeOptionalNumber(payload.royaltyPercentage, 'royaltyPercentage', {
      min: 0,
      max: 100
    }),
    maxSupply: sanitizeOptionalNumber(payload.maxSupply, 'maxSupply', {
      integer: true,
      min: 1
    }),
    mintPrice: sanitizeOptionalNumber(payload.mintPrice, 'mintPrice', {
      min: 0
    }),
    enablePublicMint: sanitizeOptionalBoolean(payload.enablePublicMint, 'enablePublicMint')
  };

  return baseApi.sanitizeRequestData(sanitized);
};

export const nftDeploymentApi = {
  /**
   * Deploy a new NFT contract for the authenticated business.
   * POST /api/nfts/deploy
   */
  async deployContract(payload: NftDeployContractParams): Promise<NftDeploymentResult> {
    const endpoint = `${BASE_PATH}/deploy`;
    const sanitizedPayload = sanitizeDeploymentPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ deployment: NftDeploymentResult }>>(
        endpoint,
        sanitizedPayload
      );

      const { deployment } = baseApi.handleResponse(
        response,
        'Failed to deploy NFT contract',
        400
      );

      return deployment;
    } catch (error) {
      throw handleApiError(
        error,
        createNftDeploymentLogContext('POST', endpoint, {
          payload: {
            name: sanitizedPayload.name,
            symbol: sanitizedPayload.symbol
          }
        })
      );
    }
  }
};

export default nftDeploymentApi;

