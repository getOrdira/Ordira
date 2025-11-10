// src/lib/api/features/domains/domainStorage.api.ts
// Domain storage API module aligned with backend routes/features/domains/domainStorage.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CreateDomainMappingInput,
  DomainMappingRecord,
  ManagedCertificatePersistence,
  UpdateDomainMappingInput
} from '@backend/services/domains/core/domainStorage.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalEnum,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/storage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createStorageLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'storage',
  method,
  endpoint,
  ...context
});

const PLAN_LEVELS = ['foundation', 'growth', 'premium', 'enterprise'] as const;

const CERTIFICATE_TYPES = ['letsencrypt', 'custom'] as const;

const VERIFICATION_METHODS: NonNullable<CreateDomainMappingInput['verificationMethod']>[] = [
  'dns',
  'file',
  'email'
];

export type CreateDomainMappingPayload = Omit<CreateDomainMappingInput, 'domain'> & {
  domain: string;
};

export type UpdateDomainMappingPayload = UpdateDomainMappingInput;

export interface DomainListFilter {
  domain?: string;
  certificateType?: CreateDomainMappingInput['certificateType'];
  planLevel?: CreateDomainMappingInput['planLevel'];
  [key: string]: unknown;
}

export interface DomainListResponse {
  domains: DomainMappingRecord[];
  total: number;
}

export interface CountDomainsResponse {
  businessId: string;
  total: number;
}

export interface CountAllDomainsResponse {
  total: number;
}

export interface DeleteDomainResponse {
  domainId: string;
  deleted: boolean;
}

const sanitizeDomainName = (domain: string) =>
  sanitizeString(domain, 'domain', {
    minLength: 3,
    maxLength: 253,
    trim: true,
    toLowerCase: true
  });

const buildCreatePayload = (payload: CreateDomainMappingPayload) => {
  const domain = sanitizeDomainName(payload.domain);
  const businessId = sanitizeOptionalObjectId(payload.businessId, 'businessId');
  const certificateType = sanitizeOptionalEnum(payload.certificateType, 'certificateType', CERTIFICATE_TYPES);
  const forceHttps = sanitizeOptionalBoolean(payload.forceHttps, 'forceHttps');
  const autoRenewal = sanitizeOptionalBoolean(payload.autoRenewal, 'autoRenewal');
  const planLevel = sanitizeOptionalEnum(payload.planLevel, 'planLevel', PLAN_LEVELS);
  const createdBy = sanitizeOptionalString(payload.createdBy, 'createdBy', {
    maxLength: 128,
    trim: true
  });
  const verificationMethod = sanitizeOptionalEnum(
    payload.verificationMethod,
    'verificationMethod',
    VERIFICATION_METHODS
  );

  return baseApi.sanitizeRequestData({
    businessId,
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

const buildUpdatePayload = (updates: UpdateDomainMappingPayload) => {
  const certificateType = sanitizeOptionalEnum(updates.certificateType, 'certificateType', CERTIFICATE_TYPES);
  const forceHttps = sanitizeOptionalBoolean(updates.forceHttps, 'forceHttps');
  const autoRenewal = sanitizeOptionalBoolean(updates.autoRenewal, 'autoRenewal');
  const verificationMethod = sanitizeOptionalEnum(
    updates.verificationMethod,
    'verificationMethod',
    VERIFICATION_METHODS
  );
  const updatedBy = sanitizeOptionalString(updates.updatedBy, 'updatedBy', {
    maxLength: 128,
    trim: true
  });

  return baseApi.sanitizeRequestData({
    certificateType,
    forceHttps,
    autoRenewal,
    verificationMethod,
    dnsRecords: updates.dnsRecords,
    metadata: updates.metadata,
    status: updates.status,
    updatedBy,
    customCertificate: updates.customCertificate
  });
};

const buildRecordCertificatePayload = (payload: ManagedCertificatePersistence) => {
  const businessId = sanitizeOptionalObjectId(payload.businessId, 'businessId');
  const domainId = sanitizeOptionalObjectId(payload.domainId, 'domainId');
  const certificateType = sanitizeOptionalEnum(payload.certificateType, 'certificateType', CERTIFICATE_TYPES);
  const issuer = sanitizeOptionalString(payload.issuer, 'issuer', { maxLength: 128, trim: true });
  const serialNumber = sanitizeOptionalString(payload.serialNumber, 'serialNumber', {
    maxLength: 128,
    trim: true
  });
  const renewedBy = sanitizeOptionalString(payload.renewedBy, 'renewedBy', { maxLength: 128, trim: true });
  const sslStatus = sanitizeOptionalString(payload.sslStatus, 'sslStatus', { maxLength: 64, trim: true });
  const autoRenewal = sanitizeOptionalBoolean(payload.autoRenewal, 'autoRenewal');
  const validFrom = sanitizeOptionalDate(payload.validFrom, 'validFrom');
  const validTo = sanitizeOptionalDate(payload.validTo, 'validTo');

  return baseApi.sanitizeRequestData({
    businessId,
    domainId,
    certificateType,
    issuer,
    validFrom,
    validTo,
    serialNumber,
    renewedBy,
    sslStatus,
    autoRenewal
  });
};

const buildDomainListQuery = (filter?: DomainListFilter) => {
  if (!filter) {
    return undefined;
  }

  const domain = filter.domain ? sanitizeDomainName(filter.domain) : undefined;
  const certificateType = sanitizeOptionalEnum(filter.certificateType, 'certificateType', CERTIFICATE_TYPES);
  const planLevel = sanitizeOptionalEnum(filter.planLevel, 'planLevel', PLAN_LEVELS);

  return baseApi.sanitizeQueryParams({
    ...filter,
    domain,
    certificateType,
    planLevel
  });
};

export const domainStorageApi = {
  /**
   * Create a domain mapping record.
   * POST /domain-mappings/storage
   */
  async createDomainMapping(payload: CreateDomainMappingPayload): Promise<DomainMappingRecord> {
    try {
      const sanitizedPayload = buildCreatePayload(payload);
      const response = await api.post<ApiResponse<{ domain: DomainMappingRecord }>>(
        BASE_PATH,
        sanitizedPayload
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to create domain mapping',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createStorageLogContext('POST', BASE_PATH, { domain: payload.domain })
      );
    }
  },

  /**
   * List domain mappings with optional filters.
   * GET /domain-mappings/storage
   */
  async listDomains(filter?: DomainListFilter): Promise<DomainListResponse> {
    try {
      const response = await api.get<ApiResponse<DomainListResponse>>(
        BASE_PATH,
        { params: buildDomainListQuery(filter) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to list domain mappings',
        500
      );
    } catch (error) {
      throw handleApiError(error, createStorageLogContext('GET', BASE_PATH, filter));
    }
  },

  /**
   * Retrieve domain mapping by id.
   * GET /domain-mappings/storage/:domainId
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
      throw handleApiError(error, createStorageLogContext('GET', `${BASE_PATH}/:domainId`, { domainId: id }));
    }
  },

  /**
   * Retrieve domain mapping by domain name.
   * GET /domain-mappings/storage/lookup
   */
  async getDomainByDomain(domain: string): Promise<DomainMappingRecord> {
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
        createStorageLogContext('GET', `${BASE_PATH}/lookup`, { domain: sanitizedDomain })
      );
    }
  },

  /**
   * Update a domain mapping.
   * PUT /domain-mappings/storage/:domainId
   */
  async updateDomainMapping(
    domainId: string,
    updates: UpdateDomainMappingPayload
  ): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = buildUpdatePayload(updates);
      const response = await api.put<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}`,
        payload
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to update domain mapping',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createStorageLogContext('PUT', `${BASE_PATH}/:domainId`, { domainId: id, updates })
      );
    }
  },

  /**
   * Delete a domain mapping.
   * DELETE /domain-mappings/storage/:domainId
   */
  async deleteDomainMapping(domainId: string): Promise<DeleteDomainResponse> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.delete<ApiResponse<DeleteDomainResponse>>(
        `${BASE_PATH}/${id}`
      );
      return baseApi.handleResponse(
        response,
        'Failed to delete domain mapping',
        400
      );
    } catch (error) {
      throw handleApiError(error, createStorageLogContext('DELETE', `${BASE_PATH}/:domainId`, { domainId: id }));
    }
  },

  /**
   * Count domain mappings for the authenticated business.
   * GET /domain-mappings/storage/count
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
      throw handleApiError(error, createStorageLogContext('GET', `${BASE_PATH}/count`));
    }
  },

  /**
   * Count all domains.
   * POST /domain-mappings/storage/count/all
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
      throw handleApiError(error, createStorageLogContext('POST', `${BASE_PATH}/count/all`, filter));
    }
  },

  /**
   * Record managed certificate metadata.
   * POST /domain-mappings/storage/:domainId/certificate/record
   */
  async recordManagedCertificate(
    domainId: string,
    payload: ManagedCertificatePersistence
  ): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const sanitizedPayload = buildRecordCertificatePayload({
        ...payload,
        domainId: payload.domainId ?? domainId
      });
      const response = await api.post<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}/certificate/record`,
        sanitizedPayload
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to record managed certificate metadata',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createStorageLogContext('POST', `${BASE_PATH}/:domainId/certificate/record`, {
          domainId: id
        })
      );
    }
  },

  /**
   * Clear managed certificate metadata for a domain mapping.
   * POST /domain-mappings/storage/:domainId/certificate/clear
   */
  async clearManagedCertificate(domainId: string): Promise<DomainMappingRecord> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.post<ApiResponse<{ domain: DomainMappingRecord }>>(
        `${BASE_PATH}/${id}/certificate/clear`
      );
      const { domain } = baseApi.handleResponse(
        response,
        'Failed to clear managed certificate metadata',
        400
      );
      return domain;
    } catch (error) {
      throw handleApiError(
        error,
        createStorageLogContext('POST', `${BASE_PATH}/:domainId/certificate/clear`, { domainId: id })
      );
    }
  }
};

export default domainStorageApi;
