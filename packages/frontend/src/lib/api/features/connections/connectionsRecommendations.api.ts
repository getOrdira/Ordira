// src/lib/api/features/connections/connectionsRecommendations.api.ts
// Connections recommendations API module aligned with backend routes/features/connections/connectionsRecommendations.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { ManufacturerRecommendation } from '@/lib/types/features/connections';
import type {
  CompatibilityReport
} from '@backend/services/connections/features/recommendations.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeObjectId
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/connections/recommendations';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createRecommendationsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'connections',
  module: 'recommendations',
  method,
  endpoint,
  ...context
});

export interface ManufacturerRecommendationsQuery {
  limit?: number;
  requireVerified?: boolean;
  excludeConnected?: boolean;
  excludePending?: boolean;
}

export interface BrandRecommendationsQuery {
  limit?: number;
}

export interface CompatibilityQuery {
  brandId: string;
  manufacturerId: string;
}

export interface BrandRecommendation {
  brandId: string;
  score: number;
  reasons: string[];
}

const buildManufacturerRecommendationsQuery = (params?: ManufacturerRecommendationsQuery) => {
  if (!params) {
    return undefined;
  }

  const query = {
    limit: sanitizeOptionalNumber(params.limit, 'limit', { integer: true, min: 1, max: 50 }),
    requireVerified: sanitizeOptionalBoolean(params.requireVerified, 'requireVerified'),
    excludeConnected: sanitizeOptionalBoolean(params.excludeConnected, 'excludeConnected'),
    excludePending: sanitizeOptionalBoolean(params.excludePending, 'excludePending')
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const buildBrandRecommendationsQuery = (params?: BrandRecommendationsQuery) => {
  if (!params) {
    return undefined;
  }

  const query = {
    limit: sanitizeOptionalNumber(params.limit, 'limit', { integer: true, min: 1, max: 50 })
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

export const connectionsRecommendationsApi = {
  /**
   * Retrieve manufacturer recommendations for the authenticated brand.
   * GET /connections/recommendations/manufacturers
   */
  async getManufacturerRecommendations(
    params?: ManufacturerRecommendationsQuery
  ): Promise<ManufacturerRecommendation[]> {
    try {
      const query = buildManufacturerRecommendationsQuery(params);
      const response = await api.get<ApiResponse<{ recommendations: ManufacturerRecommendation[] }>>(
        `${BASE_PATH}/manufacturers`,
        { params: query }
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer recommendations',
        500
      );
      return recommendations;
    } catch (error) {
      throw handleApiError(
        error,
        createRecommendationsLogContext('GET', `${BASE_PATH}/manufacturers`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Retrieve brand recommendations for the authenticated manufacturer.
   * GET /connections/recommendations/brands
   */
  async getBrandRecommendations(params?: BrandRecommendationsQuery): Promise<BrandRecommendation[]> {
    try {
      const query = buildBrandRecommendationsQuery(params);
      const response = await api.get<ApiResponse<{ recommendations: BrandRecommendation[] }>>(
        `${BASE_PATH}/brands`,
        { params: query }
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch brand recommendations',
        500
      );
      return recommendations;
    } catch (error) {
      throw handleApiError(
        error,
        createRecommendationsLogContext('GET', `${BASE_PATH}/brands`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Retrieve compatibility report for a brand/manufacturer pair.
   * GET /connections/recommendations/compatibility/:brandId/:manufacturerId
   */
  async getCompatibilityReport(params: CompatibilityQuery): Promise<CompatibilityReport> {
    const brandId = sanitizeObjectId(params.brandId, 'brandId');
    const manufacturerId = sanitizeObjectId(params.manufacturerId, 'manufacturerId');

    try {
      const response = await api.get<ApiResponse<{ report: CompatibilityReport }>>(
        `${BASE_PATH}/compatibility/${brandId}/${manufacturerId}`
      );
      const { report } = baseApi.handleResponse(
        response,
        'Failed to fetch compatibility report',
        404
      );
      return report;
    } catch (error) {
      throw handleApiError(
        error,
        createRecommendationsLogContext('GET', `${BASE_PATH}/compatibility/:brandId/:manufacturerId`, {
          brandId,
          manufacturerId
        })
      );
    }
  }
};

export default connectionsRecommendationsApi;
