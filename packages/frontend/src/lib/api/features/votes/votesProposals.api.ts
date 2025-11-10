// src/lib/api/features/votes/votesProposals.api.ts
// Voting proposals API aligned with backend routes/features/votes/votesProposals.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BusinessProposalsOptions,
  ProposalDetails
} from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/proposals';

type HttpMethod = 'GET';

const createVotesProposalsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'proposals',
  method,
  endpoint,
  ...context
});

const ALLOWED_STATUS_FILTERS = [
  'draft',
  'active',
  'completed',
  'failed',
  'pending',
  'succeeded',
  'cancelled',
  'deactivated'
] as const;

export interface BusinessProposalsQuery extends BusinessProposalsOptions {
  search?: string;
}

export interface BusinessProposalsResponse {
  businessId: string;
  proposals: ProposalDetails[];
}

const sanitizeBusinessProposalsQuery = (businessId: string, query?: BusinessProposalsQuery) => {
  const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');

  const searchTerm = query?.searchQuery ?? query?.search;

  const params = baseApi.sanitizeQueryParams({
    businessId: sanitizedBusinessId,
    searchQuery: sanitizeOptionalString(searchTerm, 'searchQuery', { maxLength: 500, trim: true }),
    status: sanitizeOptionalString(query?.status, 'status', {
      allowedValues: ALLOWED_STATUS_FILTERS,
      toLowerCase: true,
      trim: true
    }),
    limit: sanitizeOptionalNumber(query?.limit, 'limit', { integer: true, min: 1, max: 500 }),
    useCache: sanitizeOptionalBoolean(query?.useCache, 'useCache', { defaultValue: true })
  });

  return { params, businessId: sanitizedBusinessId };
};

export const votesProposalsApi = {
  /**
   * Retrieve blockchain proposal summaries for a business.
   * GET /api/votes/proposals
   */
  async getBusinessProposals(
    businessId: string,
    query?: BusinessProposalsQuery
  ): Promise<BusinessProposalsResponse> {
    const endpoint = BASE_PATH;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessProposalsQuery(businessId, query);

    try {
      const response = await api.get<ApiResponse<BusinessProposalsResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch business voting proposals', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalsLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId,
          hasFilters: Boolean(params && Object.keys(params).length > 1)
        })
      );
    }
  }
};

export default votesProposalsApi;
