// src/lib/api/features/supplyChain/supplyChainAssociation.api.ts
// Supply chain association API aligned with backend routes/features/supplyChain/supplyChainAssociation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IAssociationResult,
  IContractAssociation,
  IBusinessContractMapping
} from '@backend/services/supplyChain/core/association.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalObjectId,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/association';
const CONTRACT_TYPES = ['supplychain', 'voting', 'nft'] as const;

type HttpMethod = 'GET' | 'POST' | 'PUT';
type ContractType = typeof CONTRACT_TYPES[number];

const createSupplyChainAssociationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'association',
  method,
  endpoint,
  ...context
});

const sanitizeContractType = (value: string, field: string = 'contractType'): ContractType => {
  return sanitizeString(value, field, {
    allowedValues: CONTRACT_TYPES,
    trim: true,
    toLowerCase: true
  }) as ContractType;
};

const sanitizeOptionalContractType = (
  value?: string,
  field: string = 'contractType'
): ContractType | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return sanitizeContractType(value, field);
};

export interface StoreMappingPayload {
  businessId?: string;
  contractAddress: string;
  contractType: ContractType;
  isActive?: boolean;
}

export interface StoreMappingResponse {
  businessId: string;
  contractAddress: string;
  contractType: ContractType;
  result: IAssociationResult;
}

export interface GetMappingQuery {
  businessId?: string;
  contractType: ContractType;
}

export interface GetMappingResponse {
  businessId: string;
  contractType: ContractType;
  mapping: IBusinessContractMapping;
}

export interface GetAllMappingsResponse {
  businessId: string;
  mappings: IContractAssociation[];
}

export interface ValidateAssociationQuery {
  businessId?: string;
  contractAddress: string;
  contractType: ContractType;
}

export interface ValidateAssociationResponse {
  businessId: string;
  contractAddress: string;
  contractType: ContractType;
  valid: boolean;
}

export interface UpdateAssociationStatusPayload {
  businessId?: string;
  contractAddress: string;
  contractType: ContractType;
  isActive?: boolean;
}

export interface UpdateAssociationStatusResponse {
  businessId: string;
  contractAddress: string;
  contractType: ContractType;
  result: IAssociationResult;
}

export interface ContractStatisticsResponse {
  businessId: string;
  stats: {
    totalContracts: number;
    activeContracts: number;
    contractTypes: {
      supplychain: boolean;
      voting: boolean;
      nft: boolean;
    };
    lastDeployment?: string;
  };
}

export interface ValidateBusinessExistsResponse {
  businessId: string;
  exists: boolean;
}

export interface BusinessesByContractResponse {
  contractAddress: string;
  businesses: string[];
}

const sanitizeStoreMappingPayload = (payload: StoreMappingPayload) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress'),
    contractType: sanitizeContractType(payload.contractType),
    isActive: sanitizeOptionalBoolean(payload.isActive, 'isActive')
  });
};

const sanitizeGetMappingQuery = (query: GetMappingQuery) => {
  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    contractType: sanitizeContractType(query.contractType)
  });
};

const sanitizeValidateAssociationQuery = (query: ValidateAssociationQuery) => {
  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    contractAddress: sanitizeEthereumAddress(query.contractAddress, 'contractAddress'),
    contractType: sanitizeContractType(query.contractType)
  });
};

const sanitizeUpdateStatusPayload = (payload: UpdateAssociationStatusPayload) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress'),
    contractType: sanitizeContractType(payload.contractType),
    isActive: sanitizeOptionalBoolean(payload.isActive, 'isActive')
  });
};

const sanitizeBusinessQuery = (businessId?: string) => {
  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(businessId, 'businessId')
  });
};

const sanitizeContractAddressQuery = (contractAddress: string) => {
  return baseApi.sanitizeQueryParams({
    contractAddress: sanitizeEthereumAddress(contractAddress, 'contractAddress')
  });
};

export const supplyChainAssociationApi = {
  /**
   * Store business-contract mapping.
   * POST /api/supply-chain/association/store-mapping
   */
  async storeBusinessContractMapping(
    payload: StoreMappingPayload
  ): Promise<StoreMappingResponse> {
    const endpoint = `${BASE_PATH}/store-mapping`;
    const sanitizedPayload = sanitizeStoreMappingPayload(payload);

    try {
      const response = await api.post<ApiResponse<StoreMappingResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to store business contract mapping',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractType: sanitizedPayload.contractType
        })
      );
    }
  },

  /**
   * Retrieve business contract mapping.
   * GET /api/supply-chain/association/mapping
   */
  async getBusinessContractMapping(
    query: GetMappingQuery
  ): Promise<GetMappingResponse> {
    const endpoint = `${BASE_PATH}/mapping`;
    const params = sanitizeGetMappingQuery(query);

    try {
      const response = await api.get<ApiResponse<GetMappingResponse>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch business contract mapping',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractType: params.contractType
        })
      );
    }
  },

  /**
   * Retrieve all business contract mappings.
   * GET /api/supply-chain/association/mappings
   */
  async getAllBusinessContractMappings(businessId?: string): Promise<GetAllMappingsResponse> {
    const endpoint = `${BASE_PATH}/mappings`;
    const params = sanitizeBusinessQuery(businessId);

    try {
      const response = await api.get<ApiResponse<GetAllMappingsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch business contract mappings',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('GET', endpoint, {
          businessId: params.businessId
        })
      );
    }
  },

  /**
   * Validate business contract association.
   * GET /api/supply-chain/association/validate
   */
  async validateBusinessContractAssociation(
    query: ValidateAssociationQuery
  ): Promise<ValidateAssociationResponse> {
    const endpoint = `${BASE_PATH}/validate`;
    const params = sanitizeValidateAssociationQuery(query);

    try {
      const response = await api.get<ApiResponse<ValidateAssociationResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to validate business contract association',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          contractType: params.contractType
        })
      );
    }
  },

  /**
   * Update contract association status.
   * PUT /api/supply-chain/association/update-status
   */
  async updateContractAssociationStatus(
    payload: UpdateAssociationStatusPayload
  ): Promise<UpdateAssociationStatusResponse> {
    const endpoint = `${BASE_PATH}/update-status`;
    const sanitizedPayload = sanitizeUpdateStatusPayload(payload);

    try {
      const response = await api.put<ApiResponse<UpdateAssociationStatusResponse>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to update contract association status',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('PUT', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          contractType: sanitizedPayload.contractType
        })
      );
    }
  },

  /**
   * Retrieve contract statistics.
   * GET /api/supply-chain/association/statistics
   */
  async getContractStatistics(businessId?: string): Promise<ContractStatisticsResponse> {
    const endpoint = `${BASE_PATH}/statistics`;
    const params = sanitizeBusinessQuery(businessId);

    try {
      const response = await api.get<ApiResponse<ContractStatisticsResponse>>(endpoint, {
        params
      });
      const result = baseApi.handleResponse(
        response,
        'Failed to fetch contract statistics',
        500
      );

      return {
        ...result,
        stats: {
          ...result.stats,
          lastDeployment: result.stats.lastDeployment
            ? new Date(result.stats.lastDeployment).toISOString()
            : undefined
        }
      };
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('GET', endpoint, {
          businessId: params.businessId
        })
      );
    }
  },

  /**
   * Validate business existence.
   * GET /api/supply-chain/association/validate-business
   */
  async validateBusinessExists(businessId?: string): Promise<ValidateBusinessExistsResponse> {
    const endpoint = `${BASE_PATH}/validate-business`;
    const params = sanitizeBusinessQuery(businessId);

    try {
      const response = await api.get<ApiResponse<ValidateBusinessExistsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to validate business existence',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('GET', endpoint, {
          businessId: params.businessId
        })
      );
    }
  },

  /**
   * Retrieve businesses by contract address.
   * GET /api/supply-chain/association/businesses
   */
  async getBusinessesByContractAddress(
    contractAddress: string
  ): Promise<BusinessesByContractResponse> {
    const endpoint = `${BASE_PATH}/businesses`;
    const params = sanitizeContractAddressQuery(contractAddress);

    try {
      const response = await api.get<ApiResponse<BusinessesByContractResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch businesses by contract address',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAssociationLogContext('GET', endpoint, {
          contractAddress: params.contractAddress
        })
      );
    }
  }
};

export default supplyChainAssociationApi;