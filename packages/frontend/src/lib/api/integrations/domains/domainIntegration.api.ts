// src/lib/api/integrations/domains/domainIntegration.api.ts
// Domain integration API aligned with backend routes/integrations/domains/domainIntegration.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/domains';

type HttpMethod = 'GET' | 'POST';

const createDomainIntegrationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'domains',
  method,
  endpoint,
  ...context
});

export interface DomainInstructionResponse {
  businessId?: string;
  domainId: string;
  instructionSet: Record<string, unknown>;
}

export interface DnsEvaluationPayload {
  tokenOverride?: string;
  skipTxtValidation?: boolean;
}

export interface DnsEvaluationResponse {
  businessId?: string;
  domainId: string;
  evaluation: Record<string, unknown>;
}

export interface CertificateIssuePayload {
  requestedBy?: string;
  daysBeforeExpiry?: number;
}

export interface CertificateOperationResponse {
  businessId?: string;
  domainId: string;
  operationId: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
}

export interface CertificateSummaryResponse {
  businessId?: string;
  domainId: string;
  summary: Record<string, unknown>;
}

export interface DomainParams {
  businessId?: string;
  domainId: string;
}

const sanitizeDomainParams = (params: DomainParams) => {
  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(params.businessId, 'businessId'),
    domainId: sanitizeString(params.domainId, 'domainId', {
      trim: true,
      minLength: 1,
      maxLength: 200
    })
  });
};

const sanitizeDnsEvaluationPayload = (payload: DnsEvaluationPayload) => {
  return baseApi.sanitizeRequestData({
    tokenOverride: sanitizeOptionalString(payload.tokenOverride, 'tokenOverride', {
      trim: true,
      maxLength: 500
    }),
    skipTxtValidation: sanitizeOptionalBoolean(payload.skipTxtValidation, 'skipTxtValidation')
  });
};

const sanitizeCertificatePayload = (payload: CertificateIssuePayload, fieldPrefix: string) => {
  return baseApi.sanitizeRequestData({
    requestedBy: sanitizeOptionalString(payload.requestedBy, `${fieldPrefix}.requestedBy`, {
      trim: true,
      maxLength: 200
    }),
    daysBeforeExpiry: sanitizeOptionalNumber(payload.daysBeforeExpiry, `${fieldPrefix}.daysBeforeExpiry`, {
      integer: true,
      min: 1,
      max: 60
    })
  });
};

export const domainIntegrationApi = {
  /**
   * Retrieve DNS instruction set for a domain.
   * GET /api/integrations/domains/:domainId/instructions
   */
  async getDnsInstructionSet(params: DomainParams): Promise<DomainInstructionResponse> {
    const sanitizedParams = sanitizeDomainParams(params);
    const endpoint = `${BASE_PATH}/${sanitizedParams.domainId}/instructions`;

    try {
      const response = await api.get<ApiResponse<DomainInstructionResponse>>(endpoint, {
        params: {
          businessId: sanitizedParams.businessId
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch domain DNS instructions',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDomainIntegrationLogContext('GET', endpoint, {
          businessId: sanitizedParams.businessId
        })
      );
    }
  },

  /**
   * Evaluate current DNS records for domain readiness.
   * POST /api/integrations/domains/:domainId/evaluate-dns
   */
  async evaluateDnsRecords(
    params: DomainParams,
    payload: DnsEvaluationPayload
  ): Promise<DnsEvaluationResponse> {
    const sanitizedParams = sanitizeDomainParams(params);
    const sanitizedPayload = sanitizeDnsEvaluationPayload(payload);
    const endpoint = `${BASE_PATH}/${sanitizedParams.domainId}/evaluate-dns`;

    try {
      const response = await api.post<ApiResponse<DnsEvaluationResponse>>(endpoint, sanitizedPayload, {
        params: {
          businessId: sanitizedParams.businessId
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to evaluate domain DNS records',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDomainIntegrationLogContext('POST', endpoint, {
          businessId: sanitizedParams.businessId,
          hasTokenOverride: Boolean(sanitizedPayload.tokenOverride)
        })
      );
    }
  },

  /**
   * Issue managed certificate for a domain.
   * POST /api/integrations/domains/:domainId/certificate/issue
   */
  async issueManagedCertificate(
    params: DomainParams,
    payload: CertificateIssuePayload
  ): Promise<CertificateOperationResponse> {
    const sanitizedParams = sanitizeDomainParams(params);
    const sanitizedPayload = sanitizeCertificatePayload(payload, 'issueCertificate');
    const endpoint = `${BASE_PATH}/${sanitizedParams.domainId}/certificate/issue`;

    try {
      const response = await api.post<ApiResponse<CertificateOperationResponse>>(endpoint, sanitizedPayload, {
        params: {
          businessId: sanitizedParams.businessId
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to issue managed certificate',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDomainIntegrationLogContext('POST', endpoint, {
          businessId: sanitizedParams.businessId,
          requestedBy: sanitizedPayload.requestedBy
        })
      );
    }
  },

  /**
   * Schedule certificate auto-renewal for a domain.
   * POST /api/integrations/domains/:domainId/certificate/auto-renew
   */
  async scheduleCertificateAutoRenewal(
    params: DomainParams,
    payload: CertificateIssuePayload
  ): Promise<CertificateOperationResponse> {
    const sanitizedParams = sanitizeDomainParams(params);
    const sanitizedPayload = sanitizeCertificatePayload(payload, 'autoRenewal');
    const endpoint = `${BASE_PATH}/${sanitizedParams.domainId}/certificate/auto-renew`;

    try {
      const response = await api.post<ApiResponse<CertificateOperationResponse>>(endpoint, sanitizedPayload, {
        params: {
          businessId: sanitizedParams.businessId
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to schedule certificate auto-renewal',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDomainIntegrationLogContext('POST', endpoint, {
          businessId: sanitizedParams.businessId,
          requestedBy: sanitizedPayload.requestedBy
        })
      );
    }
  },

  /**
   * Retrieve domain certificate summary.
   * GET /api/integrations/domains/:domainId/certificate/summary
   */
  async getCertificateSummary(params: DomainParams): Promise<CertificateSummaryResponse> {
    const sanitizedParams = sanitizeDomainParams(params);
    const endpoint = `${BASE_PATH}/${sanitizedParams.domainId}/certificate/summary`;

    try {
      const response = await api.get<ApiResponse<CertificateSummaryResponse>>(endpoint, {
        params: {
          businessId: sanitizedParams.businessId
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch domain certificate summary',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDomainIntegrationLogContext('GET', endpoint, {
          businessId: sanitizedParams.businessId
        })
      );
    }
  }
};

export default domainIntegrationApi;