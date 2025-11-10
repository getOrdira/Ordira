// src/lib/api/features/nft/nftData.api.ts
// NFT data API aligned with backend routes/features/nft/nftData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse, PaginationMeta } from '@/lib/types/core';
import type {
  NftCertificateListFilters,
  NftCertificateListResponse,
  NftCertificateRecord,
  NftContractRecord,
  NftContractInfo,
  NftVerificationResult
} from '@/lib/types/features/nft';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/nfts';
const CERTIFICATE_STATUSES = [
  'minted',
  'pending',
  'pending_transfer',
  'transferred_to_brand',
  'transfer_failed',
  'revoked'
] as const;

type HttpMethod = 'GET';

const createNftDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'nfts',
  module: 'data',
  method,
  endpoint,
  ...context
});

const sanitizeCertificatesQuery = (filters?: NftCertificateListFilters) => {
  if (!filters) {
    return undefined;
  }

  const productId = sanitizeOptionalObjectId(filters.productId, 'productId');
  const status = sanitizeOptionalString(filters.status, 'status', {
    allowedValues: CERTIFICATE_STATUSES,
    toLowerCase: true,
    trim: true
  });
  const sortBy = sanitizeOptionalString(filters.sortBy, 'sortBy', {
    allowedValues: ['createdAt', 'tokenId', 'mintedAt'],
    trim: true
  });
  const sortOrder = sanitizeOptionalString(filters.sortOrder, 'sortOrder', {
    allowedValues: ['asc', 'desc'],
    toLowerCase: true,
    trim: true
  });
  const limit = sanitizeOptionalNumber(filters.limit, 'limit', {
    integer: true,
    min: 1,
    max: 100
  });
  const offset = sanitizeOptionalNumber(filters.offset, 'offset', {
    integer: true,
    min: 0
  });
  const page = sanitizeOptionalNumber(filters.page, 'page', {
    integer: true,
    min: 1
  });

  return baseApi.sanitizeQueryParams({
    productId,
    status,
    sortBy,
    sortOrder,
    limit,
    offset,
    page
  });
};

const sanitizeTokenParams = (contractAddress: string, tokenId: string) => {
  const normalizedAddress = sanitizeEthereumAddress(contractAddress, 'contractAddress');
  const normalizedTokenId = sanitizeString(tokenId, 'tokenId', {
    trim: true,
    minLength: 1,
    maxLength: 256
  });

  return {
    contractAddress: normalizedAddress,
    tokenId: normalizedTokenId
  };
};

export const nftDataApi = {
  /**
   * List NFT certificates for the authenticated business.
   * GET /api/nfts/certificates
   */
  async listCertificates(
    filters?: NftCertificateListFilters
  ): Promise<NftCertificateListResponse> {
    const endpoint = `${BASE_PATH}/certificates`;
    const params = sanitizeCertificatesQuery(filters);

    try {
      const response = await api.get<ApiResponse<{
        certificates: NftCertificateRecord[];
        pagination: PaginationMeta;
        total: number;
      }>>(endpoint, {
        params
      });

      const data = baseApi.handleResponse(
        response,
        'Failed to fetch NFT certificates',
        500
      );

      return {
        certificates: data.certificates,
        pagination: data.pagination,
        total: data.total
      };
    } catch (error) {
      throw handleApiError(
        error,
        createNftDataLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  },

  /**
   * List NFT contracts associated with the authenticated business.
   * GET /api/nfts/contracts
   */
  async listContracts(): Promise<NftContractRecord[]> {
    const endpoint = `${BASE_PATH}/contracts`;
    try {
      const response = await api.get<ApiResponse<{ contracts: NftContractRecord[] }>>(endpoint);
      const { contracts } = baseApi.handleResponse(
        response,
        'Failed to fetch NFT contracts',
        500
      );
      return contracts;
    } catch (error) {
      throw handleApiError(error, createNftDataLogContext('GET', endpoint));
    }
  },

  /**
   * Retrieve metadata for a specific NFT contract.
   * GET /api/nfts/contracts/:contractAddress
   */
  async getContractMetadata(contractAddress: string): Promise<NftContractInfo> {
    const normalizedAddress = sanitizeEthereumAddress(contractAddress, 'contractAddress');
    const endpoint = `${BASE_PATH}/contracts/${normalizedAddress}`;

    try {
      const response = await api.get<ApiResponse<{ metadata: NftContractInfo }>>(endpoint);
      const { metadata } = baseApi.handleResponse(
        response,
        'Failed to fetch NFT contract metadata',
        500
      );
      return metadata;
    } catch (error) {
      throw handleApiError(
        error,
        createNftDataLogContext('GET', `${BASE_PATH}/contracts/:contractAddress`, {
          contractAddress: normalizedAddress
        })
      );
    }
  },

  /**
   * Retrieve the token URI for a given NFT token.
   * GET /api/nfts/tokens/:contractAddress/:tokenId/uri
   */
  async getTokenUri(contractAddress: string, tokenId: string): Promise<string> {
    const { contractAddress: normalizedAddress, tokenId: normalizedTokenId } =
      sanitizeTokenParams(contractAddress, tokenId);
    const endpoint = `${BASE_PATH}/tokens/${normalizedAddress}/${normalizedTokenId}/uri`;

    try {
      const response = await api.get<ApiResponse<{ tokenURI: string }>>(endpoint);
      const { tokenURI } = baseApi.handleResponse(
        response,
        'Failed to fetch token URI',
        500
      );
      return tokenURI;
    } catch (error) {
      throw handleApiError(
        error,
        createNftDataLogContext('GET', `${BASE_PATH}/tokens/:contractAddress/:tokenId/uri`, {
          contractAddress: normalizedAddress,
          tokenId: normalizedTokenId
        })
      );
    }
  },

  /**
   * Retrieve the owner address for a given NFT token.
   * GET /api/nfts/tokens/:contractAddress/:tokenId/owner
   */
  async getTokenOwner(contractAddress: string, tokenId: string): Promise<string> {
    const { contractAddress: normalizedAddress, tokenId: normalizedTokenId } =
      sanitizeTokenParams(contractAddress, tokenId);
    const endpoint = `${BASE_PATH}/tokens/${normalizedAddress}/${normalizedTokenId}/owner`;

    try {
      const response = await api.get<ApiResponse<{ owner: string }>>(endpoint);
      const { owner } = baseApi.handleResponse(
        response,
        'Failed to fetch token owner',
        500
      );
      return owner;
    } catch (error) {
      throw handleApiError(
        error,
        createNftDataLogContext('GET', `${BASE_PATH}/tokens/:contractAddress/:tokenId/owner`, {
          contractAddress: normalizedAddress,
          tokenId: normalizedTokenId
        })
      );
    }
  },

  /**
   * Verify NFT authenticity and retrieve certificate metadata.
   * GET /api/nfts/verify/:contractAddress/:tokenId
   */
  async verifyNft(contractAddress: string, tokenId: string): Promise<NftVerificationResult> {
    const { contractAddress: normalizedAddress, tokenId: normalizedTokenId } =
      sanitizeTokenParams(contractAddress, tokenId);
    const endpoint = `${BASE_PATH}/verify/${normalizedAddress}/${normalizedTokenId}`;

    try {
      const response = await api.get<ApiResponse<{ verification: NftVerificationResult }>>(endpoint);
      const { verification } = baseApi.handleResponse(
        response,
        'Failed to verify NFT authenticity',
        500
      );
      return verification;
    } catch (error) {
      throw handleApiError(
        error,
        createNftDataLogContext('GET', `${BASE_PATH}/verify/:contractAddress/:tokenId`, {
          contractAddress: normalizedAddress,
          tokenId: normalizedTokenId
        })
      );
    }
  }
};

export default nftDataApi;

