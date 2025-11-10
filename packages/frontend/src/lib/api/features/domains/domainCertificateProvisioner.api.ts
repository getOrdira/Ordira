// src/lib/api/features/domains/domainCertificateProvisioner.api.ts
// Domain certificate provisioner API module aligned with backend routes/features/domains/domainCertificateProvisioner.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CertificateDetails,
  StoredCertificateInfo
} from '@backend/services/domains/core/certificateProvisioner.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/certificate/provisioner';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createProvisionerLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'certificate-provisioner',
  method,
  endpoint,
  ...context
});

export interface CertificateProvisionPayload {
  hostname: string;
  useStaging?: boolean;
}

export interface CertificateInfoResponse {
  hostname: string;
  certificate: StoredCertificateInfo;
}

export interface CertificateProvisionResponse {
  hostname: string;
  certificate: CertificateDetails;
}

export interface CertificateRevocationResponse {
  hostname: string;
  revoked: boolean;
}

export interface CertificateListResponse {
  certificates: string[];
  total: number;
}

const sanitizeHostnamePayload = (payload: CertificateProvisionPayload) => {
  const hostname = sanitizeString(payload.hostname, 'hostname', {
    minLength: 3,
    maxLength: 253,
    trim: true,
    toLowerCase: true
  });
  const useStaging = sanitizeOptionalBoolean(payload.useStaging, 'useStaging');

  return {
    body: baseApi.sanitizeRequestData({
      hostname,
      useStaging
    }),
    query: baseApi.sanitizeQueryParams({
      hostname
    }),
    context: {
      hostname,
      useStaging
    }
  };
};

export const domainCertificateProvisionerApi = {
  /**
   * Provision a certificate for the provided hostname.
   * POST /domain-mappings/certificate/provisioner/provision
   */
  async provisionCertificate(
    payload: CertificateProvisionPayload
  ): Promise<CertificateProvisionResponse> {
    const { body, context } = sanitizeHostnamePayload(payload);

    try {
      const response = await api.post<ApiResponse<CertificateProvisionResponse>>(
        `${BASE_PATH}/provision`,
        body
      );
      return baseApi.handleResponse(
        response,
        'Failed to provision certificate',
        502
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProvisionerLogContext('POST', `${BASE_PATH}/provision`, context)
      );
    }
  },

  /**
   * Retrieve certificate metadata for a hostname.
   * GET /domain-mappings/certificate/provisioner/info
   */
  async getCertificateInfo(hostname: string): Promise<CertificateInfoResponse> {
    const sanitizedHostname = sanitizeString(hostname, 'hostname', {
      minLength: 3,
      maxLength: 253,
      trim: true,
      toLowerCase: true
    });

    try {
      const response = await api.get<ApiResponse<CertificateInfoResponse>>(
        `${BASE_PATH}/info`,
        {
          params: baseApi.sanitizeQueryParams({ hostname: sanitizedHostname })
        }
      );
      return baseApi.handleResponse(
        response,
        'Failed to retrieve certificate info',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProvisionerLogContext('GET', `${BASE_PATH}/info`, { hostname: sanitizedHostname })
      );
    }
  },

  /**
   * Renew an existing certificate for a hostname.
   * POST /domain-mappings/certificate/provisioner/renew
   */
  async renewCertificate(
    payload: CertificateProvisionPayload
  ): Promise<CertificateProvisionResponse> {
    const { body, context } = sanitizeHostnamePayload(payload);

    try {
      const response = await api.post<ApiResponse<CertificateProvisionResponse>>(
        `${BASE_PATH}/renew`,
        body
      );
      return baseApi.handleResponse(
        response,
        'Failed to renew certificate',
        502
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProvisionerLogContext('POST', `${BASE_PATH}/renew`, context)
      );
    }
  },

  /**
   * Revoke a certificate for the provided hostname.
   * POST /domain-mappings/certificate/provisioner/revoke
   */
  async revokeCertificate(
    payload: CertificateProvisionPayload
  ): Promise<CertificateRevocationResponse> {
    const { body, context } = sanitizeHostnamePayload(payload);

    try {
      const response = await api.post<ApiResponse<CertificateRevocationResponse>>(
        `${BASE_PATH}/revoke`,
        body
      );
      return baseApi.handleResponse(
        response,
        'Failed to revoke certificate',
        502
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProvisionerLogContext('POST', `${BASE_PATH}/revoke`, context)
      );
    }
  },

  /**
   * List hostnames with stored certificates.
   * GET /domain-mappings/certificate/provisioner/list
   */
  async listCertificates(): Promise<CertificateListResponse> {
    try {
      const response = await api.get<ApiResponse<CertificateListResponse>>(
        `${BASE_PATH}/list`
      );
      return baseApi.handleResponse(
        response,
        'Failed to list certificates',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProvisionerLogContext('GET', `${BASE_PATH}/list`)
      );
    }
  }
};

export default domainCertificateProvisionerApi;
