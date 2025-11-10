// src/lib/api/features/supplyChain/supplyChainQrCode.api.ts
// Supply chain QR code API aligned with backend routes/features/supplyChain/supplyChainQrCode.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IQrCodeOptions,
  IQrCodeGenerationRequest,
  IQrCodeGenerationResult,
  ISupplyChainQrCodeRequest,
  ICertificateQrCodeRequest,
  IVotingQrCodeRequest,
  IQrCodeData,
  QrCodeType
} from '@/lib/types/features/supplyChain';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeObjectId,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/qr-code';
const QR_CODE_TYPES = [
  'supply_chain_tracking',
  'certificate_verification',
  'voting'
] as const;
const QR_CODE_FORMATS = ['png', 'svg', 'pdf'] as const;
const QR_CODE_ERROR_LEVELS = ['L', 'M', 'Q', 'H'] as const;
const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type HttpMethod = 'GET' | 'POST';

const createSupplyChainQrLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'qrCode',
  method,
  endpoint,
  ...context
});

export interface SupplyChainQrCodeResponse {
  request: ISupplyChainQrCodeRequest;
  result: IQrCodeGenerationResult;
}

export interface CertificateQrCodeResponse {
  request: ICertificateQrCodeRequest;
  result: IQrCodeGenerationResult;
}

export interface VotingQrCodeResponse {
  request: IVotingQrCodeRequest;
  result: IQrCodeGenerationResult;
}

export interface QrCodeWithLogoResponse {
  request: IQrCodeGenerationRequest;
  logoUrl: string;
  result: IQrCodeGenerationResult;
}

export interface BatchQrCodeResponse {
  requests: IQrCodeGenerationRequest[];
  results: IQrCodeGenerationResult[];
}

export interface QrCodeParseResponse {
  parsed: IQrCodeData | null;
}

export interface QrCodeValidateResponse {
  valid: boolean;
}

export interface QrCodeStatisticsResponse {
  businessId: string;
  contractAddress: string;
  stats: {
    totalQrCodes: number;
    qrCodesByType: Record<string, number>;
    lastGenerated?: string;
  };
}

export interface QrCodeRegenerateResponse {
  request: IQrCodeGenerationRequest;
  result: IQrCodeGenerationResult;
}

export interface QrCodeDeactivateResponse {
  qrCodeId: string;
  result: {
    success: boolean;
    error?: string;
  };
}

const sanitizeQrCodeType = (value: QrCodeType | string | undefined, field: string) => {
  if (!value) {
    return 'supply_chain_tracking' as QrCodeType;
  }
  return sanitizeString(value, field, {
    allowedValues: QR_CODE_TYPES,
    trim: true,
    toLowerCase: true
  }) as QrCodeType;
};

const sanitizeQrCodeOptions = (options?: IQrCodeOptions, prefix: string = 'options'): IQrCodeOptions | undefined => {
  if (!options) {
    return undefined;
  }

  const sanitizedColor = options.color
    ? {
        dark: sanitizeOptionalString(options.color.dark, `${prefix}.color.dark`, {
          trim: true,
          maxLength: 20
        }),
        light: sanitizeOptionalString(options.color.light, `${prefix}.color.light`, {
          trim: true,
          maxLength: 20
        })
      }
    : undefined;

  const logoSize = options.logo
    ? sanitizeOptionalNumber(options.logo.size, `${prefix}.logo.size`, {
        integer: true,
        min: 1
      }) ?? 128
    : undefined;

  const sanitizedLogo = options.logo
    ? {
        url: sanitizeString(options.logo.url, `${prefix}.logo.url`, {
          trim: true,
          maxLength: 500
        }),
        size: logoSize!
      }
    : undefined;

  const format = sanitizeOptionalString(options.format, `${prefix}.format`, {
    trim: true,
    allowedValues: QR_CODE_FORMATS
  }) as IQrCodeOptions['format'] | undefined;

  const errorCorrectionLevel = sanitizeOptionalString(
    options.errorCorrectionLevel,
    `${prefix}.errorCorrectionLevel`,
    {
      trim: true,
      allowedValues: QR_CODE_ERROR_LEVELS
    }
  ) as IQrCodeOptions['errorCorrectionLevel'] | undefined;

  return baseApi.sanitizeRequestData({
    size: sanitizeOptionalNumber(options.size, `${prefix}.size`, {
      integer: true,
      min: 64,
      max: 2048
    }),
    format,
    errorCorrectionLevel,
    margin: sanitizeOptionalNumber(options.margin, `${prefix}.margin`, {
      integer: true,
      min: 0,
      max: 20
    }),
    color: sanitizedColor,
    logo: sanitizedLogo
  });
};

const sanitizeSupplyChainRequest = (
  payload: ISupplyChainQrCodeRequest
): ISupplyChainQrCodeRequest => ({
  productId: sanitizeString(payload.productId, 'productId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  productName: sanitizeString(payload.productName, 'productName', {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  manufacturerId: sanitizeString(payload.manufacturerId, 'manufacturerId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress'),
  businessId: sanitizeObjectId(payload.businessId, 'businessId'),
  options: sanitizeQrCodeOptions(payload.options)
});

const sanitizeCertificateRequest = (
  payload: ICertificateQrCodeRequest
): ICertificateQrCodeRequest => ({
  certificateId: sanitizeString(payload.certificateId, 'certificateId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  tokenId: sanitizeString(payload.tokenId, 'tokenId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress'),
  options: sanitizeQrCodeOptions(payload.options)
});

const sanitizeVotingRequest = (
  payload: IVotingQrCodeRequest
): IVotingQrCodeRequest => ({
  proposalId: sanitizeString(payload.proposalId, 'proposalId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  voterEmail: sanitizeString(payload.voterEmail, 'voterEmail', {
    trim: true,
    pattern: EMAIL_REGEX
  }),
  options: sanitizeQrCodeOptions(payload.options)
});

const sanitizeGenerationRequest = (
  payload: IQrCodeGenerationRequest,
  index?: number
): IQrCodeGenerationRequest => {
  const prefix = index !== undefined ? `requests[${index}]` : 'request';
  return {
    type: sanitizeQrCodeType(payload.type, `${prefix}.type`),
    data: sanitizeOptionalJsonObject<Record<string, unknown>>(payload.data, `${prefix}.data`) ?? {},
    options: sanitizeQrCodeOptions(payload.options, `${prefix}.options`)
  };
};

const sanitizeBaseQuery = (params: { businessId?: string; contractAddress?: string }) =>
  baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(params.businessId, 'businessId'),
    contractAddress: params.contractAddress
      ? sanitizeEthereumAddress(params.contractAddress, 'contractAddress')
      : undefined
  });

export const supplyChainQrCodeApi = {
  /**
   * Generate supply chain tracking QR code.
   * POST /api/supply-chain/qr-code/generate-supply-chain
   */
  async generateSupplyChainQrCode(
    payload: ISupplyChainQrCodeRequest
  ): Promise<SupplyChainQrCodeResponse> {
    const endpoint = `${BASE_PATH}/generate-supply-chain`;
    const sanitizedPayload = sanitizeSupplyChainRequest(payload);

    try {
      const response = await api.post<ApiResponse<SupplyChainQrCodeResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to generate supply chain QR code',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          productId: sanitizedPayload.productId,
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress
        })
      );
    }
  },

  /**
   * Generate certificate verification QR code.
   * POST /api/supply-chain/qr-code/generate-certificate
   */
  async generateCertificateQrCode(
    payload: ICertificateQrCodeRequest
  ): Promise<CertificateQrCodeResponse> {
    const endpoint = `${BASE_PATH}/generate-certificate`;
    const sanitizedPayload = sanitizeCertificateRequest(payload);

    try {
      const response = await api.post<ApiResponse<CertificateQrCodeResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to generate certificate QR code',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          certificateId: sanitizedPayload.certificateId,
          tokenId: sanitizedPayload.tokenId
        })
      );
    }
  },

  /**
   * Generate voting QR code.
   * POST /api/supply-chain/qr-code/generate-voting
   */
  async generateVotingQrCode(
    payload: IVotingQrCodeRequest
  ): Promise<VotingQrCodeResponse> {
    const endpoint = `${BASE_PATH}/generate-voting`;
    const sanitizedPayload = sanitizeVotingRequest(payload);

    try {
      const response = await api.post<ApiResponse<VotingQrCodeResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to generate voting QR code',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          proposalId: sanitizedPayload.proposalId
        })
      );
    }
  },

  /**
   * Generate QR code with logo overlay.
   * POST /api/supply-chain/qr-code/generate-with-logo
   */
  async generateQrCodeWithLogo(
    payload: IQrCodeGenerationRequest & { logoUrl: string }
  ): Promise<QrCodeWithLogoResponse> {
    const endpoint = `${BASE_PATH}/generate-with-logo`;
    const sanitizedRequest = sanitizeGenerationRequest(payload);
    const sanitizedLogoUrl = sanitizeString(payload.logoUrl, 'logoUrl', {
      trim: true,
      maxLength: 500
    });

    const requestBody = baseApi.sanitizeRequestData({
      ...sanitizedRequest,
      logoUrl: sanitizedLogoUrl
    });

    try {
      const response = await api.post<ApiResponse<QrCodeWithLogoResponse>>(endpoint, requestBody);
      return baseApi.handleResponse(
        response,
        'Failed to generate QR code with logo',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          type: sanitizedRequest.type
        })
      );
    }
  },

  /**
   * Generate multiple QR codes in batch.
   * POST /api/supply-chain/qr-code/batch
   */
  async generateBatchQrCodes(
    payload: IQrCodeGenerationRequest[] | { requests: IQrCodeGenerationRequest[] }
  ): Promise<BatchQrCodeResponse> {
    const endpoint = `${BASE_PATH}/batch`;
    const requestsArray = Array.isArray(payload) ? payload : payload.requests;
    const sanitizedRequests = (requestsArray ?? []).map((request, index) =>
      sanitizeGenerationRequest(request, index)
    );

    const requestBody = baseApi.sanitizeRequestData({
      requests: sanitizedRequests
    });

    try {
      const response = await api.post<ApiResponse<BatchQrCodeResponse>>(endpoint, requestBody);
      return baseApi.handleResponse(
        response,
        'Failed to generate batch QR codes',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          count: sanitizedRequests.length
        })
      );
    }
  },

  /**
   * Parse QR code data.
   * POST /api/supply-chain/qr-code/parse
   */
  async parseQrCodeData(payload: { qrCodeData: string }): Promise<QrCodeParseResponse> {
    const endpoint = `${BASE_PATH}/parse`;
    const sanitizedPayload = baseApi.sanitizeRequestData({
      qrCodeData: sanitizeString(payload.qrCodeData, 'qrCodeData', {
        trim: true,
        minLength: 1
      })
    });

    try {
      const response = await api.post<ApiResponse<QrCodeParseResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to parse QR code data',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {})
      );
    }
  },

  /**
   * Validate QR code data payload.
   * POST /api/supply-chain/qr-code/validate
   */
  async validateQrCodeData(payload: { data: Record<string, unknown> }): Promise<QrCodeValidateResponse> {
    const endpoint = `${BASE_PATH}/validate`;
    const sanitizedPayload = baseApi.sanitizeRequestData({
      data: sanitizeOptionalJsonObject<Record<string, unknown>>(payload.data, 'data') ?? {}
    });

    try {
      const response = await api.post<ApiResponse<QrCodeValidateResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to validate QR code data',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {})
      );
    }
  },

  /**
   * Retrieve QR code statistics for a business.
   * GET /api/supply-chain/qr-code/statistics
   */
  async getQrCodeStatistics(query: { businessId?: string; contractAddress: string }): Promise<QrCodeStatisticsResponse> {
    const endpoint = `${BASE_PATH}/statistics`;
    const params = sanitizeBaseQuery(query);

    try {
      const response = await api.get<ApiResponse<QrCodeStatisticsResponse>>(endpoint, { params });
      const statistics = baseApi.handleResponse(
        response,
        'Failed to fetch QR code statistics',
        500
      );

      return {
        ...statistics,
        stats: {
          ...statistics.stats,
          lastGenerated: statistics.stats.lastGenerated
            ? new Date(statistics.stats.lastGenerated).toISOString()
            : undefined
        }
      };
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  },

  /**
   * Regenerate QR code.
   * POST /api/supply-chain/qr-code/regenerate
   */
  async regenerateQrCode(
    payload: IQrCodeGenerationRequest
  ): Promise<QrCodeRegenerateResponse> {
    const endpoint = `${BASE_PATH}/regenerate`;
    const sanitizedPayload = sanitizeGenerationRequest(payload);

    try {
      const response = await api.post<ApiResponse<QrCodeRegenerateResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to regenerate QR code',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          type: sanitizedPayload.type
        })
      );
    }
  },

  /**
   * Deactivate QR code.
   * POST /api/supply-chain/qr-code/deactivate
   */
  async deactivateQrCode(payload: { qrCodeId: string; reason?: string }): Promise<QrCodeDeactivateResponse> {
    const endpoint = `${BASE_PATH}/deactivate`;
    const sanitizedPayload = baseApi.sanitizeRequestData({
      qrCodeId: sanitizeString(payload.qrCodeId, 'qrCodeId', {
        trim: true,
        minLength: 1,
        maxLength: 200
      }),
      reason: sanitizeOptionalString(payload.reason, 'reason', {
        trim: true,
        maxLength: 1000
      })
    });

    try {
      const response = await api.post<ApiResponse<QrCodeDeactivateResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to deactivate QR code',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainQrLogContext('POST', endpoint, {
          qrCodeId: sanitizedPayload.qrCodeId
        })
      );
    }
  }
};

export default supplyChainQrCodeApi;