// src/lib/api/features/domains/domainRegistry.api.ts
// Domain registry API module aligned with backend routes/features/domains/domainRegistry.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ManagedCertificateResult,
  RegisterDomainOptions
} from '@backend/services/domains/core/domainRegistry.service';
import type { StoredCertificateInfo } from '@backend/services/domains/core/certificateProvisioner.service';
import type { DomainMappingRecord } from '@/lib/types/features/domains';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/registry';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createRegistryLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'registry',
  method,
  endpoint,
  ...context
});

const PLAN_LEVELS = ['foundation', 'growth', 'premium', 'enterprise'] as const;

const CERTIFICATE_TYPES = ['letsencrypt', 'custom'] as const;
const VERIFICATION_METHODS = ['dns'] as const;

export interface RegisterDomainPayload {
  domain: string;
  certificateType?: RegisterDomainOptions['certificateType'];
  forceHttps?: boolean;
  autoRenewal?: boolean;
  planLevel?: RegisterDomainOptions['planLevel'];
  createdBy?: string;
  verificationMethod?: RegisterDomainOptions['verificationMethod'];
  dnsRecords?: RegisterDomainOptions['dnsRecords'];
  metadata?: RegisterDomainOptions['metadata'];
}

export type UpdateDomainConfigurationPayload = Partial<Omit<RegisterDomainPayload, 'domain' | 'createdBy'>>;

export interface CountDomainsResponse {
  businessId: string;
  total: number;
}

export interface DeleteDomainResponse {
  domainId: string;
  deleted: boolean;
}

export interface CountAllDomainsResponse {
  total: number;
}

export interface DomainListResponse {
  domains: DomainMappingRecord[];
  total: number;
}

export interface CertificateRequestOptions {
  requestedBy?: string;
}

const sanitizeDomainName = (domain: string) =>
  sanitizeString(domain, 'domain', {
    minLength: 3,
    maxLength: 253,
    trim: true,
    toLowerCase: true
  });

const sanitizeRequestedBy = (requestedBy?: string) =>
  sanitizeOptionalString(requestedBy, 'requestedBy', {
    maxLength: 128,
    trim: true
  });

const buildRegisterPayload = (payload: RegisterDomainPayload) => {
  const domain = sanitizeDomainName(payload.domain);
  const certificateType = sanitizeOptionalEnum(payload.certificateType, 'certificateType', CERTIFICATE_TYPES);
  const forceHttps = sanitizeOptionalBoolean(payload.forceHttps, 'forceHttps');
  const autoRenewal = sanitizeOptionalBoolean(payload.autoRenewal, 'autoRenewal');
  const planLevel = sanitizeOptionalEnum(payload.planLevel, 'planLevel', PLAN_LEVELS);
  const createdBy = sanitizeRequestedBy(payload.createdBy);
  const verificationMethod = sanitizeOptionalEnum(
    payload.verificationMethod,
    'verificationMethod',
    VERIFICATION_METHODS
  );

  return baseApi.sanitizeRequestData({
    domain,
    certificateType,
    forceHttps,
    autoRenewal,
    planLevel,
    createdBy,
    verificationMethod,
    dnsRecords: payload.dnsRecords,
    metadata: payload.metadata
  });
};

const buildUpdatePayload = (updates: UpdateDomainConfigurationPayload) => {
  const certificateType = sanitizeOptionalEnum(updates.certificateType, 'certificateType', CERTIFICATE_TYPES);
  const forceHttps = sanitizeOptionalBoolean(updates.forceHttps, 'forceHttps');
  const autoRenewal = sanitizeOptionalBoolean(updates.autoRenewal, 'autoRenewal');
  const planLevel = sanitizeOptionalEnum(updates.planLevel, 'planLevel', PLAN_LEVELS);
  const verificationMethod = sanitizeOptionalEnum(
    updates.verificationMethod,
    'verificationMethod',
    VERIFICATION_METHODS
  );

  return baseApi.sanitizeRequestData({
    certificateType,
    forceHttps,
    autoRenewal,
    planLevel,
    verificationMethod,
    dnsRecords: updates.dnsRecords,
    metadata: updates.metadata
  });
};

const buildCertificateRequestPayload = (options?: CertificateRequestOptions) =>
  baseApi.sanitizeRequestData({
    requestedBy: sanitizeRequestedBy(options?.requestedBy)
  });

export const domainRegistryApi = {
  /**
   * Register a new domain mapping.
   * POST /domain-mappings/registry
   */
  async registerDomain(payload: RegisterDomainPayload): Promise<DomainMappingRecord> {
    try {
      const sanitizedPayload = buildRegisterPayload(payload);
      const response = await api.post<ApiResponse<{ domain: DomainMappingRecord }>>(
        BASE_PATH,
        sanitizedPayload
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to register domain',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createRegistryLogContext('POST', BASE_PATH, { domain: payload.domain })
      );
    }
  },

  /**
   * List domains for the authenticated business.
   * GET /domain-mappings/registry
   */
  async listDomains(): Promise<DomainListResponse> {
    try {
      const response = await api.get<ApiResponse<DomainListResponse>>(BASE_PATH);
      return baseApi.handleResponse(
        response,
        'Failed to fetch domains',
        500
      );
    } catch (error) {
      throw handleApiError(error, createRegistryLogContext('GET', BASE_PATH));
    }
  },

  /**
   * Count domains for the authenticated business.
   * GET /domain-mappings/registry/count
   */
  async countDomains(): Promise<CountDomainsResponse> {
    try {
      const response = await api.get<ApiResponse<CountDomainsResponse>>(
        `${BASE_PATH}/count`
      );
      return baseApi.handleResponse(
        response,
        'Failed to retrieve domain count',
        500
      );
    } catch (error) {
      throw handleApiError(error, createRegistryLogContext('GET', `${BASE_PATH}/count`));
    }
  },

  /**
   * Count all domains (admin/reporting).
   * POST /domain-mappings/registry/count/all
   */
  async countAllDomains(filter?: Record<string, unknown>): Promise<CountAllDomainsResponse> {
    try {
      const payload = baseApi.sanitizeRequestData(filter ?? {});
      const response = await api.post<ApiResponse<CountAllDomainsResponse>>(
        `${BASE_PATH}/count/all`,
        payload
      );
      return baseApi.handleResponse(
        response,
        'Failed to retrieve total domain count',
        500
      );
    } catch (error) {
      throw handleApiError(error, createRegistryLogContext('POST', `${BASE_PATH}/count/all`));
    }
  },

  /**
   * Retrieve domain mapping by domain name.
   * GET /domain-mappings/registry/lookup
   */
  async getDomainByName(domain: string): Promise<DomainMappingRecord> {
    const sanitizedDomain = sanitizeDomainName(domain);

    try {
      const response = await api.get<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/lookup`,
        {
          params: baseApi.sanitizeQueryParams({ domain: sanitizedDomain })
        }
      );
      const { domain: mapping } = baseApi.handleResponse(
        response,
        'Failed to fetch domain mapping',
        404
      );
      return mapping;
    } catch (error) {
      throw handleApiError(
        error,
        createRegistryLogContext('GET', `${BASE_PATH}/lookup`, { domain: sanitizedDomain })
      );
    }
  },

  /**
   * Retrieve domain mapping by id.
   * GET /domain-mappings/registry/:domainId
   */
  async getDomainById(domainId: string): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.get<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}`
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to fetch domain mapping',
        404
      );
      return domain;
    } catch (error) {
      throw handleApiError(error, createRegistryLogContext('GET', `${BASE_PATH}/:domainId`, { domainId: id }));
    }
  },

  /**
   * Update domain configuration.
   * PATCH /domain-mappings/registry/:domainId
   */
  async updateDomainConfiguration(
    domainId: string,
    updates: UpdateDomainConfigurationPayload
  ): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = buildUpdatePayload(updates);
      const response = await api.patch<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}`,
        payload
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to update domain configuration',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createRegistryLogContext('PATCH', `${BASE_PATH}/:domainId`, { domainId: id, updates })
      );
    }
  },

  /**
   * Delete a domain mapping.
   * DELETE /domain-mappings/registry/:domainId
   */
  async deleteDomain(domainId: string): Promise<DeleteDomainResponse> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.delete<ApiResponse<DeleteDomainResponse>>(
        `${BASE_PATH}/${id}`
      );
      return baseApi.handleResponse(
        response,
        'Failed to delete domain',
        400
      );
    } catch (error) {
      throw handleApiError(error, createRegistryLogContext('DELETE', `${BASE_PATH}/:domainId`, { domainId: id }));
    }
  },

  /**
   * Retrieve managed certificate metadata for a domain.
   * GET /domain-mappings/registry/:domainId/certificate
   */
  async getManagedCertificate(domainId: string): Promise<StoredCertificateInfo> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.get<ApiResponse<{ hostname: string; certificate: StoredCertificateInfo }>>(
        `${BASE_PATH}/${id}/certificate`
      );
      const { certificate } = baseApi.handleResponse(
        response,
        'Failed to fetch managed certificate',
        500
      );
      return certificate;
    } catch (error) {
      throw handleApiError(
        error,
        createRegistryLogContext('GET', `${BASE_PATH}/:domainId/certificate`, { domainId: id })
      );
    }
  },

  /**
   * Issue a managed certificate for a domain mapping.
   * POST /domain-mappings/registry/:domainId/certificate
   */
  async issueManagedCertificate(
    domainId: string,
    options?: CertificateRequestOptions
  ): Promise<ManagedCertificateResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = buildCertificateRequestPayload(options);
      const response = await api.post<ApiResponse<ManagedCertificateResult>>(
        `${BASE_PATH}/${id}/certificate`,
        payload
      );
      return baseApi.handleResponse(
        response,
        'Failed to issue managed certificate',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createRegistryLogContext('POST', `${BASE_PATH}/:domainId/certificate`, {
          domainId: id,
          requestedBy: options?.requestedBy
        })
      );
    }
  },

  /**
   * Renew a managed certificate.
   * POST /domain-mappings/registry/:domainId/certificate/renew
   */
  async renewManagedCertificate(
    domainId: string,
    options?: CertificateRequestOptions
  ): Promise<ManagedCertificateResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = buildCertificateRequestPayload(options);
      const response = await api.post<ApiResponse<ManagedCertificateResult>>(
        `${BASE_PATH}/${id}/certificate/renew`,
        payload
      );
      return baseApi.handleResponse(
        response,
        'Failed to renew managed certificate',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createRegistryLogContext('POST', `${BASE_PATH}/:domainId/certificate/renew`, {
          domainId: id,
          requestedBy: options?.requestedBy
        })
      );
    }
  },

  /**
   * Revoke a managed certificate for a domain mapping.
   * POST /domain-mappings/registry/:domainId/certificate/revoke
   */
  async revokeManagedCertificate(domainId: string): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.post<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}/certificate/revoke`
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
        createRegistryLogContext('POST', `${BASE_PATH}/:domainId/certificate/revoke`, { domainId: id })
      );
    }
  }
};

export default domainRegistryApi;
