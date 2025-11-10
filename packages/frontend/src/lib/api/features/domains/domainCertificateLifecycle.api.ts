// src/lib/api/features/domains/domainCertificateLifecycle.api.ts
// Domain certificate lifecycle API module aligned with backend routes/features/domains/domainCertificateLifecycle.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AutoRenewalSchedule,
  CertificateLifecycleResult
} from '@backend/services/domains/features/domainCertificateLifecycle.service';
import type { DomainMappingRecord } from '@backend/services/domains/core/domainStorage.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalNumber,
  sanitizeOptionalString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/certificate';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createLifecycleLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'certificate-lifecycle',
  method,
  endpoint,
  ...context
});

export interface LifecycleRequestOptions {
  requestedBy?: string;
}

export interface CertificateSummary {
  certificateType: DomainMappingRecord['certificateType'];
  expiresInDays?: number;
  expiresAt?: Date;
  autoRenewal: boolean;
  status: DomainMappingRecord['sslStatus'];
}

const sanitizeRequestedBy = (requestedBy?: string) =>
  sanitizeOptionalString(requestedBy, 'requestedBy', {
    maxLength: 128,
    trim: true
  });

const sanitizeSchedulePayload = (daysBeforeExpiry?: number) => {
  const sanitizedDays = sanitizeOptionalNumber(daysBeforeExpiry, 'daysBeforeExpiry', {
    integer: true,
    min: 1,
    max: 60
  });

  return baseApi.sanitizeRequestData({
    daysBeforeExpiry: sanitizedDays
  });
};

export const domainCertificateLifecycleApi = {
  /**
   * Issue a managed certificate for the specified domain.
   * POST /domains/certificate-lifecycle/:domainId/issue
   */
  async issueManagedCertificate(
    domainId: string,
    options?: LifecycleRequestOptions
  ): Promise<CertificateLifecycleResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = baseApi.sanitizeRequestData({
        requestedBy: sanitizeRequestedBy(options?.requestedBy)
      });
      const response = await api.post<ApiResponse<{ result: CertificateLifecycleResult }>>(
        `${BASE_PATH}/${id}/issue`,
        payload
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to issue managed certificate',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createLifecycleLogContext('POST', `${BASE_PATH}/:domainId/issue`, {
          domainId: id,
          requestedBy: options?.requestedBy
        })
      );
    }
  },

  /**
   * Renew an existing managed certificate.
   * POST /domains/certificate-lifecycle/:domainId/renew
   */
  async renewManagedCertificate(
    domainId: string,
    options?: LifecycleRequestOptions
  ): Promise<CertificateLifecycleResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = baseApi.sanitizeRequestData({
        requestedBy: sanitizeRequestedBy(options?.requestedBy)
      });
      const response = await api.post<ApiResponse<{ result: CertificateLifecycleResult }>>(
        `${BASE_PATH}/${id}/renew`,
        payload
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to renew managed certificate',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createLifecycleLogContext('POST', `${BASE_PATH}/:domainId/renew`, {
          domainId: id,
          requestedBy: options?.requestedBy
        })
      );
    }
  },

  /**
   * Revoke a managed certificate for the given domain.
   * POST /domains/certificate-lifecycle/:domainId/revoke
   */
  async revokeManagedCertificate(domainId: string): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.post<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}/revoke`
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to revoke managed certificate',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createLifecycleLogContext('POST', `${BASE_PATH}/:domainId/revoke`, { domainId: id })
      );
    }
  },

  /**
   * Schedule certificate auto-renewal.
   * POST /domains/certificate-lifecycle/:domainId/schedule-auto-renewal
   */
  async scheduleAutoRenewal(
    domainId: string,
    daysBeforeExpiry?: number
  ): Promise<AutoRenewalSchedule | null> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = sanitizeSchedulePayload(daysBeforeExpiry);
      const response = await api.post<ApiResponse<{ schedule: AutoRenewalSchedule | null }>>(
        `${BASE_PATH}/${id}/schedule-auto-renewal`,
        payload
      );
      const { schedule } = baseApi.handleResponse(
        response,
        'Failed to schedule certificate auto-renewal',
        400,
        { requireData: false }
      ) ?? { schedule: null };
      return schedule ?? null;
    } catch (error) {
      throw handleApiError(
        error,
        createLifecycleLogContext('POST', `${BASE_PATH}/:domainId/schedule-auto-renewal`, {
          domainId: id,
          daysBeforeExpiry
        })
      );
    }
  },

  /**
   * Retrieve current certificate summary for the domain.
   * GET /domains/certificate-lifecycle/:domainId/summary
   */
  async getCertificateSummary(domainId: string): Promise<CertificateSummary> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.get<ApiResponse<{ summary: CertificateSummary }>>(
        `${BASE_PATH}/${id}/summary`
      );
      const { summary } = baseApi.handleResponse(
        response,
        'Failed to retrieve certificate summary',
        500
      );
      return summary;
    } catch (error) {
      throw handleApiError(
        error,
        createLifecycleLogContext('GET', `${BASE_PATH}/:domainId/summary`, { domainId: id })
      );
    }
  }
};

export default domainCertificateLifecycleApi;
