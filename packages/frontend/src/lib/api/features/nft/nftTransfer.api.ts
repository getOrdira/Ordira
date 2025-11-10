// src/lib/api/features/nft/nftTransfer.api.ts
// NFT transfer API aligned with backend routes/features/nft/nftTransfer.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { NftTransferParams, NftTransferResult } from '@/lib/types/features/nft';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeString } from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/nfts';

type HttpMethod = 'POST';

const createNftTransferLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'nfts',
  module: 'transfer',
  method,
  endpoint,
  ...context
});

const sanitizeTransferPayload = (payload: NftTransferParams) => {
  const sanitized = {
    tokenId: sanitizeString(payload.tokenId, 'tokenId', {
      minLength: 1,
      maxLength: 256,
      trim: true
    }),
    contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress'),
    fromAddress: sanitizeEthereumAddress(payload.fromAddress, 'fromAddress'),
    toAddress: sanitizeEthereumAddress(payload.toAddress, 'toAddress')
  };

  return baseApi.sanitizeRequestData(sanitized);
};

export const nftTransferApi = {
  /**
   * Transfer an NFT certificate to a destination wallet.
   * POST /api/nfts/transfer
   */
  async transferNft(payload: NftTransferParams): Promise<NftTransferResult> {
    const endpoint = `${BASE_PATH}/transfer`;
    const sanitizedPayload = sanitizeTransferPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ transfer: NftTransferResult }>>(
        endpoint,
        sanitizedPayload
      );

      const { transfer } = baseApi.handleResponse(
        response,
        'Failed to transfer NFT certificate',
        400
      );

      return transfer;
    } catch (error) {
      throw handleApiError(
        error,
        createNftTransferLogContext('POST', endpoint, {
          contractAddress: sanitizedPayload.contractAddress,
          tokenId: sanitizedPayload.tokenId,
          from: sanitizedPayload.fromAddress,
          to: sanitizedPayload.toAddress
        })
      );
    }
  }
};

export default nftTransferApi;

