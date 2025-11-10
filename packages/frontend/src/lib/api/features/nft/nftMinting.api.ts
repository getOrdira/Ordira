// src/lib/api/features/nft/nftMinting.api.ts
// NFT minting API aligned with backend routes/features/nft/nftMinting.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { NftMintParams, NftMintResult } from '@/lib/types/features/nft';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalArray,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';
import { ValidationError } from '@/lib/errors/errors';

const BASE_PATH = '/nfts';

type HttpMethod = 'POST';

const createNftMintingLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'nfts',
  module: 'minting',
  method,
  endpoint,
  ...context
});

const sanitizeAttributes = (
  attributes?: NftMintParams['metadata'] extends { attributes: infer A } ? A : Array<{ trait_type: string; value: string | number; display_type?: string; }>
) => {
  if (!attributes) {
    return undefined;
  }

  return sanitizeOptionalArray(
    attributes,
    'metadata.attributes',
    (attribute, index) => {
      const traitType = sanitizeString(
        (attribute as any)?.trait_type,
        `metadata.attributes[${index}].trait_type`,
        {
          minLength: 1,
          maxLength: 50,
          trim: true
        }
      );

      const displayType = sanitizeOptionalString(
        (attribute as any)?.display_type,
        `metadata.attributes[${index}].display_type`,
        {
          maxLength: 50,
          trim: true
        }
      );

      const rawValue = (attribute as any)?.value;
      let value: string | number;

      if (typeof rawValue === 'number') {
        if (!Number.isFinite(rawValue)) {
          throw new ValidationError('metadata.attributes value must be a finite number', `metadata.attributes[${index}].value`);
        }
        value = rawValue;
      } else {
        value = sanitizeString(
          rawValue,
          `metadata.attributes[${index}].value`,
          {
            minLength: 1,
            maxLength: 200,
            trim: true
          }
        );
      }

      return {
        trait_type: traitType,
        value,
        display_type: displayType
      };
    },
    {
      maxLength: 50
    }
  ) ?? undefined;
};

const sanitizeMetadata = (metadata?: NftMintParams['metadata']) => {
  if (!metadata) {
    return undefined;
  }

  const sanitized = baseApi.sanitizeRequestData({
    name: sanitizeOptionalString(metadata.name, 'metadata.name', {
      maxLength: 200,
      trim: true
    }),
    description: sanitizeOptionalString(metadata.description, 'metadata.description', {
      maxLength: 1000,
      trim: true
    }),
    attributes: sanitizeAttributes(metadata.attributes)
  });

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const sanitizeMintPayload = (payload: NftMintParams) => {
  const sanitizedMetadata = sanitizeMetadata(payload.metadata);

  const sanitized = {
    productId: sanitizeObjectId(payload.productId, 'productId'),
    recipient: sanitizeEthereumAddress(payload.recipient, 'recipient'),
    quantity: sanitizeOptionalNumber(payload.quantity, 'quantity', {
      integer: true,
      min: 1,
      max: 100
    }),
    metadata: sanitizedMetadata,
    certificateTemplate: sanitizeOptionalString(payload.certificateTemplate, 'certificateTemplate', {
      maxLength: 200,
      trim: true
    }),
    customMessage: sanitizeOptionalString(payload.customMessage, 'customMessage', {
      maxLength: 500,
      trim: true
    })
  };

  return baseApi.sanitizeRequestData(sanitized);
};

export const nftMintingApi = {
  /**
   * Mint an NFT certificate for a product recipient.
   * POST /api/nfts/mint
   */
  async mintNft(payload: NftMintParams): Promise<NftMintResult> {
    const endpoint = `${BASE_PATH}/mint`;
    const sanitizedPayload = sanitizeMintPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ mint: NftMintResult }>>(
        endpoint,
        sanitizedPayload
      );

      const { mint } = baseApi.handleResponse(
        response,
        'Failed to mint NFT certificate',
        400
      );

      return mint;
    } catch (error) {
      throw handleApiError(
        error,
        createNftMintingLogContext('POST', endpoint, {
          productId: sanitizedPayload.productId,
          recipient: sanitizedPayload.recipient
        })
      );
    }
  }
};

export default nftMintingApi;

