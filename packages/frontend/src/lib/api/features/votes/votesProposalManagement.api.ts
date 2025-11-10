// src/lib/api/features/votes/votesProposalManagement.api.ts
// Voting proposal management API aligned with backend routes/features/votes/votesProposalManagement.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CreateProposalInput,
  DeployProposalResult,
  ProposalStatistics,
  ProposalStatus,
  UpdateProposalInput
} from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/proposal-management';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const createVotesProposalManagementLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'proposal-management',
  method,
  endpoint,
  ...context
});

const sanitizeBusinessParams = (businessId: string) => {
  const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
  return {
    params: baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId }),
    businessId: sanitizedBusinessId
  };
};

const sanitizeProposalId = (proposalId: string) =>
  sanitizeString(proposalId, 'proposalId', { maxLength: 200, trim: true });

const toArray = (value: string[] | string | undefined): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
};

const sanitizeStringArrayInput = (
  value: string[] | string | undefined,
  field: string,
  options: { maxLength?: number; minLength?: number } = {}
): string[] | undefined => {
  const normalized = toArray(value);
  if (!normalized) {
    return undefined;
  }

  return sanitizeArray(
    normalized,
    field,
    (item, index) =>
      sanitizeString(item, `${field}[${index}]`, {
        trim: true,
        maxLength: options.maxLength ?? 200
      }),
    {
      minLength: options.minLength,
      maxLength: options.maxLength
    }
  );
};

const sanitizeCreateProposalPayload = (payload: CreateProposalPayload) => {
  const productIds = sanitizeStringArrayInput(payload.productIds, 'productIds', { minLength: 1, maxLength: 100 });
  if (!productIds || productIds.length === 0) {
    throw new Error('productIds must contain at least one entry');
  }

  const mediaIds = sanitizeStringArrayInput(payload.mediaIds, 'mediaIds');
  const tags = sanitizeStringArrayInput(payload.tags, 'tags', { maxLength: 100 });

  const start = sanitizeOptionalDate(payload.startTime, 'startTime');
  const end = sanitizeOptionalDate(payload.endTime, 'endTime');

  return baseApi.sanitizeRequestData({
    title: sanitizeString(payload.title, 'title', { minLength: 3, maxLength: 500, trim: true }),
    description: sanitizeString(payload.description, 'description', { minLength: 10, maxLength: 10000, trim: true }),
    category: sanitizeOptionalString(payload.category, 'category', { maxLength: 200, trim: true }),
    imageUrl: sanitizeOptionalString(payload.imageUrl, 'imageUrl', { maxLength: 1000, trim: true }),
    productIds,
    mediaIds,
    allowMultipleSelections: sanitizeOptionalBoolean(payload.allowMultipleSelections, 'allowMultipleSelections'),
    maxSelections: sanitizeOptionalNumber(payload.maxSelections, 'maxSelections', { integer: true, min: 1, max: 50 }),
    requireReason: sanitizeOptionalBoolean(payload.requireReason, 'requireReason'),
    duration: sanitizeOptionalNumber(payload.duration, 'duration', { integer: true, min: 60 }),
    startTime: start ? start.toISOString() : undefined,
    endTime: end ? end.toISOString() : undefined,
    priority: sanitizeOptionalString(payload.priority, 'priority', {
      allowedValues: ['low', 'medium', 'high'],
      toLowerCase: true,
      trim: true
    }) as UpdateProposalInput['priority'],
    tags,
    deployToBlockchain: sanitizeOptionalBoolean(payload.deployToBlockchain, 'deployToBlockchain')
  });
};

const sanitizeUpdateProposalPayload = (payload: UpdateProposalPayload) => {
  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    updates.title = sanitizeOptionalString(payload.title, 'title', { minLength: 3, maxLength: 500, trim: true });
  }

  if (payload.description !== undefined) {
    updates.description = sanitizeOptionalString(payload.description, 'description', {
      minLength: 10,
      maxLength: 10000,
      trim: true
    });
  }

  if (payload.category !== undefined) {
    updates.category = sanitizeOptionalString(payload.category, 'category', { maxLength: 200, trim: true });
  }

  if (payload.imageUrl !== undefined) {
    updates.imageUrl = sanitizeOptionalString(payload.imageUrl, 'imageUrl', { maxLength: 1000, trim: true });
  }

  if (payload.priority !== undefined) {
    updates.priority = sanitizeOptionalString(payload.priority, 'priority', {
      allowedValues: ['low', 'medium', 'high'],
      toLowerCase: true,
      trim: true
    }) as UpdateProposalInput['priority'];
  }

  if (payload.duration !== undefined) {
    updates.duration = sanitizeOptionalNumber(payload.duration, 'duration', { integer: true, min: 60 });
  }

  if (payload.endTime !== undefined) {
    const end = sanitizeOptionalDate(payload.endTime, 'endTime');
    updates.endTime = end ? end.toISOString() : undefined;
  }

  if (payload.tags !== undefined) {
    updates.tags = sanitizeStringArrayInput(payload.tags, 'tags', { maxLength: 100 });
  }

  return baseApi.sanitizeRequestData(updates);
};

export interface CreateProposalPayload
  extends Omit<CreateProposalInput, 'productIds' | 'mediaIds' | 'tags' | 'startTime' | 'endTime'> {
  productIds: string[] | string;
  mediaIds?: string[] | string;
  tags?: string[] | string;
  startTime?: Date | string;
  endTime?: Date | string;
  deployToBlockchain?: boolean;
}

export interface UpdateProposalPayload
  extends Partial<Omit<UpdateProposalInput, 'tags' | 'endTime'>> {
  tags?: string[] | string;
  endTime?: Date | string;
}

export interface VotingProposalRecord extends Record<string, unknown> {
  proposalId: string;
  title?: string;
  description?: string;
  status?: ProposalStatus;
  category?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  startTime?: string | Date;
  endTime?: string | Date;
}

export interface CreateProposalResponse {
  proposal: VotingProposalRecord;
  createdAt: string;
}

export interface UpdateProposalResponse {
  proposal: VotingProposalRecord;
  updatedAt: string;
}

export interface ProposalActionResponse {
  proposal: VotingProposalRecord;
  activatedAt?: string;
  deactivatedAt?: string;
  completedAt?: string;
  canceledAt?: string;
}

export interface DeployProposalResponse {
  proposalId: string;
  deployment: DeployProposalResult;
  deployedAt: string;
}

export interface ListProposalsQuery {
  status?: ProposalStatus;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ListProposalsResponse {
  proposals: VotingProposalRecord[];
  total: number;
}

export interface DeleteProposalResponse {
  proposalId: string;
  deleted: boolean;
  deletedAt: string;
}

const sanitizeListQuery = (query?: ListProposalsQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    status: sanitizeOptionalString(query.status, 'status', {
      allowedValues: ['draft', 'active', 'completed', 'failed', 'pending', 'succeeded', 'cancelled', 'deactivated'],
      toLowerCase: true,
      trim: true
    }),
    category: sanitizeOptionalString(query.category, 'category', { maxLength: 200, trim: true }),
    limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 500 }),
    offset: sanitizeOptionalNumber(query.offset, 'offset', { integer: true, min: 0 })
  });
};

export const votesProposalManagementApi = {
  /**
   * Create a new proposal.
   * POST /api/votes/proposal-management
   */
  async createProposal(
    businessId: string,
    payload: CreateProposalPayload
  ): Promise<CreateProposalResponse> {
    const endpoint = BASE_PATH;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);
    const productCount = toArray(payload.productIds)?.length ?? 0;
    const body = sanitizeCreateProposalPayload(payload);

    try {
      const response = await api.post<ApiResponse<CreateProposalResponse>>(endpoint, body, { params });
      return baseApi.handleResponse(response, 'Failed to create voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('POST', endpoint, {
          businessId: sanitizedBusinessId,
          productCount
        })
      );
    }
  },

  /**
   * Update an existing proposal.
   * PUT /api/votes/proposal-management/:proposalId
   */
  async updateProposal(
    businessId: string,
    proposalId: string,
    payload: UpdateProposalPayload
  ): Promise<UpdateProposalResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);
    const body = sanitizeUpdateProposalPayload(payload);

    try {
      const response = await api.put<ApiResponse<UpdateProposalResponse>>(endpoint, body, { params });
      return baseApi.handleResponse(response, 'Failed to update voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('PUT', `${BASE_PATH}/:proposalId`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Activate a proposal.
   * POST /api/votes/proposal-management/:proposalId/activate
   */
  async activateProposal(
    businessId: string,
    proposalId: string
  ): Promise<ProposalActionResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}/activate`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.post<ApiResponse<ProposalActionResponse>>(endpoint, undefined, { params });
      return baseApi.handleResponse(response, 'Failed to activate voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('POST', `${BASE_PATH}/:proposalId/activate`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Deactivate a proposal.
   * POST /api/votes/proposal-management/:proposalId/deactivate
   */
  async deactivateProposal(
    businessId: string,
    proposalId: string
  ): Promise<ProposalActionResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}/deactivate`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.post<ApiResponse<ProposalActionResponse>>(endpoint, undefined, { params });
      return baseApi.handleResponse(response, 'Failed to deactivate voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('POST', `${BASE_PATH}/:proposalId/deactivate`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Complete a proposal.
   * POST /api/votes/proposal-management/:proposalId/complete
   */
  async completeProposal(
    businessId: string,
    proposalId: string
  ): Promise<ProposalActionResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}/complete`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.post<ApiResponse<ProposalActionResponse>>(endpoint, undefined, { params });
      return baseApi.handleResponse(response, 'Failed to complete voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('POST', `${BASE_PATH}/:proposalId/complete`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Cancel a proposal.
   * POST /api/votes/proposal-management/:proposalId/cancel
   */
  async cancelProposal(
    businessId: string,
    proposalId: string
  ): Promise<ProposalActionResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}/cancel`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.post<ApiResponse<ProposalActionResponse>>(endpoint, undefined, { params });
      return baseApi.handleResponse(response, 'Failed to cancel voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('POST', `${BASE_PATH}/:proposalId/cancel`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Deploy a proposal to the blockchain.
   * POST /api/votes/proposal-management/:proposalId/deploy
   */
  async deployProposalToBlockchain(
    businessId: string,
    proposalId: string
  ): Promise<DeployProposalResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}/deploy`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.post<ApiResponse<DeployProposalResponse>>(endpoint, undefined, { params });
      return baseApi.handleResponse(response, 'Failed to deploy voting proposal to blockchain', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('POST', `${BASE_PATH}/:proposalId/deploy`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Retrieve statistics for a proposal.
   * GET /api/votes/proposal-management/:proposalId/statistics
   */
  async getProposalStatistics(
    businessId: string,
    proposalId: string
  ): Promise<{ businessId: string; stats: ProposalStatistics }> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}/statistics`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.get<ApiResponse<{ businessId: string; stats: ProposalStatistics }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to fetch voting proposal statistics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('GET', `${BASE_PATH}/:proposalId/statistics`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Retrieve a proposal.
   * GET /api/votes/proposal-management/:proposalId
   */
  async getProposal(
    businessId: string,
    proposalId: string
  ): Promise<{ proposal: VotingProposalRecord }> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.get<ApiResponse<{ proposal: VotingProposalRecord }>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting proposal', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('GET', `${BASE_PATH}/:proposalId`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * List proposals for a business.
   * GET /api/votes/proposal-management
   */
  async listProposals(
    businessId: string,
    query?: ListProposalsQuery
  ): Promise<ListProposalsResponse> {
    const endpoint = BASE_PATH;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);
    const filters = sanitizeListQuery(query);

    const mergedParams = baseApi.sanitizeQueryParams({
      ...(params ?? {}),
      ...(filters ?? {})
    });

    try {
      const response = await api.get<ApiResponse<ListProposalsResponse>>(endpoint, { params: mergedParams });
      return baseApi.handleResponse(response, 'Failed to list voting proposals', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId,
          hasFilters: Boolean(filters && Object.keys(filters).length > 0)
        })
      );
    }
  },

  /**
   * Delete a proposal.
   * DELETE /api/votes/proposal-management/:proposalId
   */
  async deleteProposal(businessId: string, proposalId: string): Promise<DeleteProposalResponse> {
    const sanitizedProposalId = sanitizeProposalId(proposalId);
    const endpoint = `${BASE_PATH}/${sanitizedProposalId}`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessParams(businessId);

    try {
      const response = await api.delete<ApiResponse<DeleteProposalResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to delete voting proposal', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesProposalManagementLogContext('DELETE', `${BASE_PATH}/:proposalId`, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  }
};

export default votesProposalManagementApi;
