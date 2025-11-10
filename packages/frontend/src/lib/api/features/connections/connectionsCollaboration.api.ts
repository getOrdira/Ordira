// src/lib/api/features/connections/connectionsCollaboration.api.ts
// Connections collaboration API module aligned with backend routes/features/connections/connectionsCollaboration.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CollaborationOverview,
  SharedProductSummary
} from '@backend/services/connections/features/collaboration.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/connections/collaboration';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createCollaborationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'connections',
  module: 'collaboration',
  method,
  endpoint,
  ...context
});

interface CollaborationQueryParams {
  brandId?: string;
  manufacturerId?: string;
}

interface CatalogQueryParams extends CollaborationQueryParams {
  limit?: number;
}

const buildCollaborationQuery = (params?: CollaborationQueryParams) => {
  if (!params) {
    return undefined;
  }

  const query = {
    brandId: sanitizeOptionalObjectId(params.brandId, 'brandId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId')
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const buildCatalogQuery = (params?: CatalogQueryParams) => {
  if (!params) {
    return undefined;
  }

  const query = {
    brandId: sanitizeOptionalObjectId(params.brandId, 'brandId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId'),
    limit: sanitizeOptionalNumber(params.limit, 'limit', { integer: true, min: 1, max: 100 })
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

export const connectionsCollaborationApi = {
  /**
   * Retrieve collaboration overview for a connection pair.
   * GET /connections/collaboration/overview
   */
  async getOverview(params?: CollaborationQueryParams): Promise<CollaborationOverview> {
    try {
      const query = buildCollaborationQuery(params);
      const response = await api.get<ApiResponse<{ overview: CollaborationOverview }>>(
        `${BASE_PATH}/overview`,
        { params: query }
      );
      const { overview } = baseApi.handleResponse(
        response,
        'Failed to fetch collaboration overview',
        500
      );
      return overview;
    } catch (error) {
      throw handleApiError(
        error,
        createCollaborationLogContext('GET', `${BASE_PATH}/overview`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Retrieve shared product catalog snapshot for a connection pair.
   * GET /connections/collaboration/catalog
   */
  async getSharedProductCatalog(params?: CatalogQueryParams): Promise<SharedProductSummary[]> {
    try {
      const query = buildCatalogQuery(params);
      const response = await api.get<ApiResponse<{ products: SharedProductSummary[] }>>(
        `${BASE_PATH}/catalog`,
        { params: query }
      );
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch shared product catalog',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createCollaborationLogContext('GET', `${BASE_PATH}/catalog`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Suggest next collaboration steps for a connection pair.
   * GET /connections/collaboration/suggestions
   */
  async suggestNextSteps(params?: CollaborationQueryParams): Promise<string[]> {
    try {
      const query = buildCollaborationQuery(params);
      const response = await api.get<ApiResponse<{ suggestions: string[] }>>(
        `${BASE_PATH}/suggestions`,
        { params: query }
      );
      const { suggestions } = baseApi.handleResponse(
        response,
        'Failed to generate collaboration suggestions',
        500
      );
      return suggestions;
    } catch (error) {
      throw handleApiError(
        error,
        createCollaborationLogContext('GET', `${BASE_PATH}/suggestions`, params ? { params } : undefined)
      );
    }
  }
};

export default connectionsCollaborationApi;
