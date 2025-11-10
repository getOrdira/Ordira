// src/lib/api/features/domains/domainDns.api.ts
// Domain DNS API module aligned with backend routes/features/domains/domainDns.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  DnsInstructionSet,
  DnsVerificationResult
} from '@backend/services/domains/features/domainDns.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/dns';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createDnsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'dns',
  method,
  endpoint,
  ...context
});

export type DnsEvaluationResult = Omit<DnsVerificationResult, 'records'>;

export interface VerifyDnsOptions {
  skipTxtValidation?: boolean;
  tokenOverride?: string;
  token?: string;
}

export interface EvaluateDomainRecordsPayload {
  hostname: string;
  token?: string;
  tokenOverride?: string;
  skipTxtValidation?: boolean;
}

const buildVerifyPayload = (options?: VerifyDnsOptions) => {
  const skipTxtValidation = sanitizeOptionalBoolean(options?.skipTxtValidation, 'skipTxtValidation');
  const tokenOverride = sanitizeOptionalString(options?.tokenOverride, 'tokenOverride', {
    maxLength: 128,
    trim: true
  });
  const token = sanitizeOptionalString(options?.token, 'token', {
    maxLength: 128,
    trim: true
  });

  const body = baseApi.sanitizeRequestData({
    skipTxtValidation,
    tokenOverride
  });

  const query = baseApi.sanitizeQueryParams({
    skipTxtValidation,
    token
  });

  return { body, query };
};

const buildEvaluatePayload = (payload: EvaluateDomainRecordsPayload) => {
  const hostname = sanitizeString(payload.hostname, 'hostname', {
    minLength: 3,
    maxLength: 253,
    trim: true,
    toLowerCase: true
  });
  const token = sanitizeOptionalString(payload.token, 'token', {
    maxLength: 128,
    trim: true
  });
  const tokenOverride = sanitizeOptionalString(payload.tokenOverride, 'tokenOverride', {
    maxLength: 128,
    trim: true
  });
  const skipTxtValidation = sanitizeOptionalBoolean(payload.skipTxtValidation, 'skipTxtValidation');

  const body = baseApi.sanitizeRequestData({
    hostname,
    tokenOverride,
    skipTxtValidation
  });

  const query = baseApi.sanitizeQueryParams({
    hostname,
    token,
    skipTxtValidation
  });

  return { body, query };
};

export const domainDnsApi = {
  /**
   * Retrieve DNS instruction set for a domain mapping.
   * GET /domain-mappings/dns/:domainId/instructions
   */
  async getInstructionSet(domainId: string): Promise<DnsInstructionSet> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.get<ApiResponse<{ instructions: DnsInstructionSet }>>(
        `${BASE_PATH}/${id}/instructions`
      );
      const { instructions } = baseApi.handleResponse(
        response,
        'Failed to retrieve DNS instruction set',
        500
      );
      return instructions;
    } catch (error) {
      throw handleApiError(
        error,
        createDnsLogContext('GET', `${BASE_PATH}/:domainId/instructions`, { domainId: id })
      );
    }
  },

  /**
   * Verify DNS configuration for a domain mapping.
   * POST /domain-mappings/dns/:domainId/verify
   */
  async verifyDnsConfiguration(
    domainId: string,
    options?: VerifyDnsOptions
  ): Promise<DnsVerificationResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const { body, query } = buildVerifyPayload(options);
      const response = await api.post<ApiResponse<{ result: DnsVerificationResult }>>(
        `${BASE_PATH}/${id}/verify`,
        body,
        { params: query }
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to verify DNS configuration',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createDnsLogContext('POST', `${BASE_PATH}/:domainId/verify`, {
          domainId: id,
          options
        })
      );
    }
  },

  /**
   * Evaluate DNS records for a hostname without persisting changes.
   * POST /domain-mappings/dns/evaluate
   */
  async evaluateDomainRecords(
    payload: EvaluateDomainRecordsPayload
  ): Promise<DnsEvaluationResult> {
    try {
      const { body, query } = buildEvaluatePayload(payload);
      const response = await api.post<ApiResponse<{ result: DnsEvaluationResult }>>(
        `${BASE_PATH}/evaluate`,
        body,
        { params: query }
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to evaluate DNS records',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createDnsLogContext('POST', `${BASE_PATH}/evaluate`, { hostname: payload.hostname })
      );
    }
  }
};

export default domainDnsApi;
