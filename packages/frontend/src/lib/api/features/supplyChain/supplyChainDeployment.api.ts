// src/lib/api/features/supplyChain/supplyChainDeployment.api.ts
// Supply chain deployment API aligned with backend routes/features/supplyChain/supplyChainDeployment.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { IDeploymentResult, ISupplyChainDeployment } from '@/lib/types/features/supplyChain';
import type { IBusinessContractMapping } from '@backend/services/supplyChain/core/association.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/supply-chain/deployment';

type HttpMethod = 'GET' | 'POST';

const createSupplyChainDeploymentLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'deployment',
  method,
  endpoint,
  ...context
});

export interface DeployContractPayload {
  businessId?: string;
  manufacturerName: string;
  gasLimit?: number | string;
  value?: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentStatusResponse {
  businessId: string;
  status: IBusinessContractMapping;
}

export interface DeploymentPrerequisitesResponse {
  businessId: string;
  prerequisites: {
    valid: boolean;
    errors: string[];
  };
}

export interface DeploymentHistoryResponse {
  businessId: string;
  history: ISupplyChainDeployment[];
}

const sanitizeDeployPayload = (payload: DeployContractPayload) => {
  const sanitizedValue = sanitizeOptionalString(payload.value, 'value', {
    trim: true,
    pattern: /^\d+$/,
    allowEmpty: false
  });

  const sanitizedPayload = {
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    manufacturerName: sanitizeString(payload.manufacturerName, 'manufacturerName', {
      minLength: 2,
      maxLength: 200,
      trim: true
    }),
    gasLimit: sanitizeOptionalNumber(payload.gasLimit, 'gasLimit', {
      integer: true,
      min: 100_000
    }),
    value: sanitizedValue,
    metadata: sanitizeOptionalJsonObject<Record<string, unknown>>(payload.metadata, 'metadata')
  };

  return baseApi.sanitizeRequestData(sanitizedPayload);
};

export const supplyChainDeploymentApi = {
  /**
   * Deploy a new supply chain contract.
   * POST /api/supply-chain/deployment/deploy
   */
  async deployContract(payload: DeployContractPayload): Promise<IDeploymentResult> {
    const endpoint = `${BASE_PATH}/deploy`;
    const sanitizedPayload = sanitizeDeployPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ deployment: IDeploymentResult }>>(
        endpoint,
        sanitizedPayload
      );
      const { deployment } = baseApi.handleResponse(
        response,
        'Failed to deploy supply chain contract',
        400
      );
      return deployment;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDeploymentLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          hasMetadata: Boolean(sanitizedPayload.metadata),
          hasGasLimit: typeof sanitizedPayload.gasLimit === 'number'
        })
      );
    }
  },

  /**
   * Retrieve deployment status for a business.
   * GET /api/supply-chain/deployment/status
   */
  async getDeploymentStatus(businessId?: string): Promise<DeploymentStatusResponse> {
    const endpoint = `${BASE_PATH}/status`;
    const params = baseApi.sanitizeQueryParams({
      businessId: sanitizeOptionalObjectId(businessId, 'businessId')
    });

    try {
      const response = await api.get<ApiResponse<DeploymentStatusResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch deployment status',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDeploymentLogContext('GET', endpoint, {
          businessId: params.businessId
        })
      );
    }
  },

  /**
   * Validate deployment prerequisites.
   * GET /api/supply-chain/deployment/prerequisites
   */
  async validatePrerequisites(businessId?: string): Promise<DeploymentPrerequisitesResponse> {
    const endpoint = `${BASE_PATH}/prerequisites`;
    const params = baseApi.sanitizeQueryParams({
      businessId: sanitizeOptionalObjectId(businessId, 'businessId')
    });

    try {
      const response = await api.get<ApiResponse<DeploymentPrerequisitesResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to validate deployment prerequisites',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDeploymentLogContext('GET', endpoint, {
          businessId: params.businessId
        })
      );
    }
  },

  /**
   * Retrieve deployment history.
   * GET /api/supply-chain/deployment/history
   */
  async getDeploymentHistory(businessId?: string): Promise<DeploymentHistoryResponse> {
    const endpoint = `${BASE_PATH}/history`;
    const params = baseApi.sanitizeQueryParams({
      businessId: sanitizeOptionalObjectId(businessId, 'businessId')
    });

    try {
      const response = await api.get<ApiResponse<DeploymentHistoryResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch deployment history',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDeploymentLogContext('GET', endpoint, {
          businessId: params.businessId
        })
      );
    }
  }
};

export default supplyChainDeploymentApi;