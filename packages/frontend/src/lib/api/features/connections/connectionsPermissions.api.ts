// src/lib/api/features/connections/connectionsPermissions.api.ts
// Connections permissions API module aligned with backend routes/features/connections/connectionsPermissions.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ConnectionFeature,
  FeatureAccessResult
} from '@backend/services/connections/features/permissions.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeEnum,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';
import { connectionsFeatureSchemas } from '@/lib/validation/schemas/features/connections';

const BASE_PATH = '/connections/permissions';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createPermissionsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'connections',
  module: 'permissions',
  method,
  endpoint,
  ...context
});

const FEATURE_KEYS = ['analytics', 'supplyChain', 'productData', 'messaging', 'fileSharing', 'recommendations'] as const;

interface FeatureRequestPayload {
  feature: ConnectionFeature;
  brandId?: string;
  manufacturerId?: string;
}

type FeatureTogglePayload = Partial<Record<ConnectionFeature, boolean>> & {
  brandId?: string;
  manufacturerId?: string;
};

type ConnectionPairOverrides = {
  brandId?: string;
  manufacturerId?: string;
};

const buildConnectionPairQuery = (params?: ConnectionPairOverrides) => {
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

const sanitizeFeatureRequestPayload = (payload: FeatureRequestPayload) => {
  const feature = sanitizeEnum<ConnectionFeature>(payload.feature, 'feature', FEATURE_KEYS);
  const brandId = sanitizeOptionalObjectId(payload.brandId, 'brandId');
  const manufacturerId = sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId');

  return baseApi.sanitizeRequestData({
    feature,
    brandId,
    manufacturerId
  });
};

const sanitizeFeatureTogglePayload = (payload: FeatureTogglePayload) => {
  const brandId = sanitizeOptionalObjectId(payload.brandId, 'brandId');
  const manufacturerId = sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId');

  const toggles = FEATURE_KEYS.reduce<Partial<Record<ConnectionFeature, boolean>>>((acc, feature) => {
    if (payload[feature] !== undefined) {
      acc[feature] = Boolean(payload[feature]);
    }
    return acc;
  }, {});

  baseApi.validatePayload(connectionsFeatureSchemas.featureToggle, toggles);

  return baseApi.sanitizeRequestData({
    brandId,
    manufacturerId,
    ...toggles
  });
};

export const connectionsPermissionsApi = {
  /**
   * Retrieve feature access matrix for a connection pair.
   * GET /connections/permissions/access
   */
  async getFeatureAccess(params?: ConnectionPairOverrides): Promise<FeatureAccessResult> {
    try {
      const query = buildConnectionPairQuery(params);
      const response = await api.get<ApiResponse<{ access: FeatureAccessResult }>>(
        `${BASE_PATH}/access`,
        { params: query }
      );
      const { access } = baseApi.handleResponse(
        response,
        'Failed to fetch connection feature access',
        500
      );
      return access;
    } catch (error) {
      throw handleApiError(
        error,
        createPermissionsLogContext('GET', `${BASE_PATH}/access`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Determine whether a connection pair can use a specific feature.
   * POST /connections/permissions/can-use
   */
  async canUseFeature(payload: FeatureRequestPayload): Promise<boolean> {
    try {
      const sanitizedPayload = sanitizeFeatureRequestPayload(payload);
      const response = await api.post<ApiResponse<{ allowed: boolean }>>(
        `${BASE_PATH}/can-use`,
        sanitizedPayload
      );
      const { allowed } = baseApi.handleResponse(
        response,
        'Failed to evaluate feature access',
        403
      );
      return allowed;
    } catch (error) {
      throw handleApiError(
        error,
        createPermissionsLogContext('POST', `${BASE_PATH}/can-use`, {
          feature: payload.feature,
          brandId: payload.brandId,
          manufacturerId: payload.manufacturerId
        })
      );
    }
  },

  /**
   * Explain why a feature is or is not available for a connection pair.
   * POST /connections/permissions/explain
   */
  async explainFeatureAccess(payload: FeatureRequestPayload): Promise<{ allowed: boolean; reason: string }> {
    try {
      const sanitizedPayload = sanitizeFeatureRequestPayload(payload);
      const response = await api.post<ApiResponse<{ explanation: { allowed: boolean; reason: string } }>>(
        `${BASE_PATH}/explain`,
        sanitizedPayload
      );
      const { explanation } = baseApi.handleResponse(
        response,
        'Failed to explain feature access',
        500
      );
      return explanation;
    } catch (error) {
      throw handleApiError(
        error,
        createPermissionsLogContext('POST', `${BASE_PATH}/explain`, {
          feature: payload.feature,
          brandId: payload.brandId,
          manufacturerId: payload.manufacturerId
        })
      );
    }
  },

  /**
   * Validate a feature toggle payload.
   * POST /connections/permissions/validate-toggle
   */
  async validateFeatureTogglePayload(payload: FeatureTogglePayload): Promise<boolean> {
    try {
      const sanitizedPayload = sanitizeFeatureTogglePayload(payload);
      const response = await api.post<ApiResponse<{ valid?: boolean }>>(
        `${BASE_PATH}/validate-toggle`,
        sanitizedPayload
      );
      const { valid = true } = baseApi.handleResponse(
        response,
        'Failed to validate feature toggle payload',
        400,
        { requireData: false }
      ) ?? {};
      return valid;
    } catch (error) {
      throw handleApiError(
        error,
        createPermissionsLogContext('POST', `${BASE_PATH}/validate-toggle`, {
          brandId: payload.brandId,
          manufacturerId: payload.manufacturerId,
          providedFeatures: FEATURE_KEYS.filter(feature => payload[feature] !== undefined)
        })
      );
    }
  }
};

export default connectionsPermissionsApi;
