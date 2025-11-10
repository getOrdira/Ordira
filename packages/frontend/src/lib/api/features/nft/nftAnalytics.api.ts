// src/lib/api/features/nft/nftAnalytics.api.ts
// NFT analytics API aligned with backend routes/features/nft/nftAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  NftCertificateAnalytics,
  NftAnalyticsOverview,
  NftAnalyticsQuery
} from '@/lib/types/features/nft';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalDate } from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/nfts/analytics';

type HttpMethod = 'GET';

const createNftAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'nfts',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

const sanitizeAnalyticsQuery = (query?: NftAnalyticsQuery) => {
  if (!query) {
    return undefined;
  }

  const startDate = sanitizeOptionalDate(query.startDate, 'startDate');
  const endDate = sanitizeOptionalDate(query.endDate, 'endDate');
  const contractAddress = sanitizeOptionalEthereumAddress(query.contractAddress, 'contractAddress');

  return baseApi.sanitizeQueryParams({
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
    contractAddress
  });
};

export const nftAnalyticsApi = {
  /**
   * Retrieve certificate analytics for the authenticated business.
   * GET /api/nfts/analytics/certificates
   */
  async getCertificateAnalytics(): Promise<NftCertificateAnalytics> {
    const endpoint = `${BASE_PATH}/certificates`;
    try {
      const response = await api.get<ApiResponse<{ analytics: NftCertificateAnalytics }>>(endpoint);
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch NFT certificate analytics',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(error, createNftAnalyticsLogContext('GET', endpoint));
    }
  },

  /**
   * Retrieve comprehensive NFT analytics with optional filters.
   * GET /api/nfts/analytics
   */
  async getAnalytics(query?: NftAnalyticsQuery): Promise<NftAnalyticsOverview> {
    const endpoint = BASE_PATH;
    const sanitizedQuery = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<{ analytics: NftAnalyticsOverview }>>(endpoint, {
        params: sanitizedQuery
      });
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch NFT analytics',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createNftAnalyticsLogContext('GET', endpoint, {
          hasFilters: Boolean(sanitizedQuery && Object.keys(sanitizedQuery).length > 0)
        })
      );
    }
  }
};

export default nftAnalyticsApi;

