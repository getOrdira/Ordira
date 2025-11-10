// src/lib/api/features/nft/nftBurning.api.ts
// NFT burning API aligned with backend routes/features/nft/nftBurning.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { NftBurnParams, NftBurnResult } from '@/lib/types/features/nft';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/nfts';

type HttpMethod = 'POST';

const createNftBurningLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'nfts',
  module: 'burning',
  method,
  endpoint,
  ...context
});

const sanitizeBurnPayload = (payload: NftBurnParams) => {
  const sanitized = {
    tokenId: sanitizeString(payload.tokenId, 'tokenId', {
      minLength: 1,
      maxLength: 256,
      trim: true
    }),
    contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress'),
    reason: sanitizeOptionalString(payload.reason, 'reason', {
      maxLength: 500,
      trim: true
    })
  };

  return baseApi.sanitizeRequestData(sanitized);
};

export const nftBurningApi = {
  /**
   * Burn (revoke) an NFT certificate.
   * POST /api/nfts/burn
   */
  async burnNft(payload: NftBurnParams): Promise<NftBurnResult> {
    const endpoint = `${BASE_PATH}/burn`;
    const sanitizedPayload = sanitizeBurnPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ burn: NftBurnResult }>>(
        endpoint,
        sanitizedPayload
      );

      const { burn } = baseApi.handleResponse(
        response,
        'Failed to burn NFT certificate',
        400
      );

      return burn;
    } catch (error) {
      throw handleApiError(
        error,
        createNftBurningLogContext('POST', endpoint, {
          contractAddress: sanitizedPayload.contractAddress,
          tokenId: sanitizedPayload.tokenId
        })
      );
    }
  }
};

export default nftBurningApi;

