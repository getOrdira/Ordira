// src/lib/api/features/certificates/certificateData.api.ts
// Certificate data API module aligned with backend routes/features/certificates/certificateData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CertificateListOptions,
  CertificateListResult,
} from '@backend/services/certificates/core';
import type { CertificateDisplay } from '@/lib/types/features/certificates';
import {
  ensureNonEmptyObject,
  logDebug,
  logError,
  sanitizeBoolean,
  sanitizeCertificateIds,
  sanitizeCertificateStatus,
  sanitizeDateInput,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalObjectId,
  sanitizeOptionalPositiveInteger,
  sanitizeOptionalString,
  sanitizeOwnershipType,
  sanitizePositiveInteger,
  sanitizeQuery,
  sanitizeRecipient,
  sanitizeSearchTerm,
  sanitizeSortBy,
  sanitizeSortOrder,
  sanitizeStatus,
  sanitizeString,
  sanitizeTransferStatus,
} from './utils';

export interface CertificateListParams extends Omit<CertificateListOptions, 'dateFrom' | 'dateTo'> {
  dateFrom?: string | Date;
  dateTo?: string | Date;
}

export interface CertificateUpdatePayload {
  status?: string;
  metadata?: Record<string, unknown>;
  transferScheduled?: boolean;
  nextTransferAttempt?: string | Date;
  transferAttempts?: number;
  transferFailed?: boolean;
  transferredToBrand?: boolean;
  transferredAt?: string | Date;
  revoked?: boolean;
  revokedAt?: string | Date;
  revokedReason?: string;
  [key: string]: unknown;
}

export interface CertificateStatusPayload {
  status: 'revoked' | 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed';
  additionalData?: Record<string, unknown>;
}

const BASE_PATH = '/certificates';

const buildListQuery = (params?: CertificateListParams): Record<string, unknown> | undefined => {
  if (!params) {
    return undefined;
  }

  const query = sanitizeQuery({
    status: sanitizeStatus(params.status, 'status'),
    transferStatus: sanitizeTransferStatus(params.transferStatus),
    page: sanitizeOptionalPositiveInteger(params.page, { fieldName: 'page', min: 1, max: 1000 }),
    limit: sanitizeOptionalPositiveInteger(params.limit, { fieldName: 'limit', min: 1, max: 100 }),
    productId: sanitizeOptionalObjectId(params.productId, 'productId'),
    recipient: sanitizeRecipient(params.recipient),
    dateFrom: sanitizeDateInput(params.dateFrom, 'dateFrom'),
    dateTo: sanitizeDateInput(params.dateTo, 'dateTo'),
    search: sanitizeSearchTerm(params.search),
    sortBy: sanitizeSortBy(params.sortBy),
    sortOrder: sanitizeSortOrder(params.sortOrder),
    ownershipType: sanitizeOwnershipType(params.ownershipType),
    hasWeb3: params.hasWeb3 !== undefined ? sanitizeBoolean(params.hasWeb3, 'hasWeb3') : undefined,
  });

  return query;
};

const buildPaginationQuery = (params?: { limit?: number; offset?: number }) =>
  sanitizeQuery({
    limit: sanitizeOptionalPositiveInteger(params?.limit, { fieldName: 'limit', min: 1, max: 100 }),
    offset: sanitizeOptionalPositiveInteger(params?.offset, { fieldName: 'offset', min: 0, max: 10_000 }),
  });

const buildDateRangeQuery = (params?: { startDate?: string | Date; endDate?: string | Date; limit?: number }) =>
  sanitizeQuery({
    startDate: sanitizeDateInput(params?.startDate, 'startDate'),
    endDate: sanitizeDateInput(params?.endDate, 'endDate'),
    limit: sanitizeOptionalPositiveInteger(params?.limit, { fieldName: 'limit', min: 1, max: 500 }),
  });

const buildLimitedQuery = (limit?: number) =>
  sanitizeQuery({ limit: sanitizeOptionalPositiveInteger(limit, { fieldName: 'limit', min: 1, max: 100 }) });

export const certificateDataApi = {
  /**
   * List certificates with filters.
   * GET /certificates
   */
  async listCertificates(params?: CertificateListParams): Promise<CertificateListResult> {
    try {
      const query = buildListQuery(params);
      logDebug('data', 'Requesting certificate list', query);

      const response = await api.get<ApiResponse<CertificateListResult>>(BASE_PATH, {
        params: query,
      });

      return baseApi.handleResponse(response, 'Failed to fetch certificates', 500);
    } catch (error) {
      logError('data', 'Certificate list request failed', error);
      throw error;
    }
  },

  /**
   * Get single certificate by ID.
   * GET /certificates/:certificateId
   */
  async getCertificate(certificateId: string): Promise<{ certificate: CertificateDisplay }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('data', 'Fetching certificate', { certificateId: id });
      const response = await api.get<ApiResponse<{ certificate: CertificateDisplay }>>(
        `${BASE_PATH}/${id}`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate', 404);
    } catch (error) {
      logError('data', 'Get certificate request failed', error);
      throw error;
    }
  },

  /**
   * Update certificate details.
   * PUT /certificates/:certificateId
   */
  async updateCertificate(
    certificateId: string,
    updates: CertificateUpdatePayload,
  ): Promise<{ certificate: CertificateDisplay }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');
    const sanitizedUpdates = ensureNonEmptyObject({ ...updates }, 'updates');

    try {
      logDebug('data', 'Updating certificate', { certificateId: id, fields: Object.keys(sanitizedUpdates) });
      const response = await api.put<ApiResponse<{ certificate: CertificateDisplay }>>(
        `${BASE_PATH}/${id}`,
        sanitizedUpdates,
      );

      return baseApi.handleResponse(response, 'Failed to update certificate', 500);
    } catch (error) {
      logError('data', 'Update certificate request failed', error);
      throw error;
    }
  },

  /**
   * Delete certificate.
   * DELETE /certificates/:certificateId
   */
  async deleteCertificate(certificateId: string): Promise<{ message: string }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('data', 'Deleting certificate', { certificateId: id });
      const response = await api.delete<ApiResponse<{ message: string }>>(`${BASE_PATH}/${id}`);
      return baseApi.handleResponse(response, 'Failed to delete certificate', 500);
    } catch (error) {
      logError('data', 'Delete certificate request failed', error);
      throw error;
    }
  },

  /**
   * Bulk update certificates.
   * PUT /certificates/bulk-update
   */
  async bulkUpdateCertificates(
    certificateIds: string[],
    updates: Record<string, unknown>,
  ): Promise<{ modifiedCount: number }> {
    const ids = sanitizeCertificateIds(certificateIds);
    const sanitizedUpdates = ensureNonEmptyObject(updates, 'updates');

    try {
      logDebug('data', 'Bulk updating certificates', { count: ids.length });
      const response = await api.put<ApiResponse<{ modifiedCount: number }>>(
        `${BASE_PATH}/bulk-update`,
        {
          certificateIds: ids,
          updates: sanitizedUpdates,
        },
      );

      return baseApi.handleResponse(response, 'Failed to bulk update certificates', 500);
    } catch (error) {
      logError('data', 'Bulk update certificates request failed', error);
      throw error;
    }
  },

  /**
   * Update certificate status.
   * PUT /certificates/:certificateId/status
   */
  async updateCertificateStatus(
    certificateId: string,
    payload: CertificateStatusPayload,
  ): Promise<{ certificate: CertificateDisplay }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');
    const status = sanitizeCertificateStatus(payload.status, 'status');
    const additionalData = payload.additionalData ? ensureNonEmptyObject(payload.additionalData, 'additionalData') : undefined;

    try {
      logDebug('data', 'Updating certificate status', { certificateId: id, status });
      const response = await api.put<ApiResponse<{ certificate: CertificateDisplay }>>(
        `${BASE_PATH}/${id}/status`,
        sanitizeQuery({ status, additionalData }),
      );

      return baseApi.handleResponse(response, 'Failed to update certificate status', 500);
    } catch (error) {
      logError('data', 'Update certificate status request failed', error);
      throw error;
    }
  },

  /**
   * Get certificate count by status.
   * GET /certificates/count-by-status
   */
  async getCertificateCountByStatus(): Promise<{ counts: Record<string, number> }> {
    try {
      logDebug('data', 'Fetching certificate count by status');
      const response = await api.get<ApiResponse<{ counts: Record<string, number> }>>(
        `${BASE_PATH}/count-by-status`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate counts', 500);
    } catch (error) {
      logError('data', 'Certificate count request failed', error);
      throw error;
    }
  },

  /**
   * Get certificates created within date range.
   * GET /certificates/date-range
   */
  async getCertificatesInDateRange(params?: { startDate?: string | Date; endDate?: string | Date; limit?: number }): Promise<{ certificates: CertificateDisplay[] }> {
    try {
      const query = buildDateRangeQuery(params);
      logDebug('data', 'Fetching certificates in date range', query);

      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/date-range`,
        { params: query },
      );

      return baseApi.handleResponse(response, 'Failed to fetch date range certificates', 500);
    } catch (error) {
      logError('data', 'Date range certificates request failed', error);
      throw error;
    }
  },

  /**
   * Get failed transfer certificates.
   * GET /certificates/failed-transfers
   */
  async getFailedTransferCertificates(limit?: number): Promise<{ certificates: CertificateDisplay[] }> {
    try {
      const params = buildLimitedQuery(limit);
      logDebug('data', 'Fetching failed transfer certificates', params);
      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/failed-transfers`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch failed transfer certificates', 500);
    } catch (error) {
      logError('data', 'Failed transfer certificates request failed', error);
      throw error;
    }
  },

  /**
   * Get pending transfer certificates.
   * GET /certificates/pending-transfers
   */
  async getPendingTransferCertificates(limit?: number): Promise<{ certificates: CertificateDisplay[] }> {
    try {
      const params = buildLimitedQuery(limit);
      logDebug('data', 'Fetching pending transfer certificates', params);
      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/pending-transfers`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch pending transfer certificates', 500);
    } catch (error) {
      logError('data', 'Pending transfer certificates request failed', error);
      throw error;
    }
  },

  /**
   * Get certificates by product.
   * GET /certificates/product/:productId
   */
  async getCertificatesByProduct(
    productId: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ certificates: CertificateDisplay[] }> {
    const id = sanitizeObjectId(productId, 'productId');
    const params = buildPaginationQuery(pagination);

    try {
      logDebug('data', 'Fetching certificates by product', { productId: id, ...params });
      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/product/${id}`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch product certificates', 500);
    } catch (error) {
      logError('data', 'Certificates by product request failed', error);
      throw error;
    }
  },

  /**
   * Get certificates by recipient.
   * GET /certificates/recipient
   */
  async getCertificatesByRecipient(
    recipient: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ certificates: CertificateDisplay[] }> {
    const params = sanitizeQuery({
      recipient: sanitizeRecipient(recipient),
      limit: sanitizeOptionalPositiveInteger(options?.limit, { fieldName: 'limit', min: 1, max: 100 }),
      offset: sanitizeOptionalPositiveInteger(options?.offset, { fieldName: 'offset', min: 0, max: 10_000 }),
    });

    try {
      logDebug('data', 'Fetching certificates by recipient', params);
      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/recipient`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch recipient certificates', 500);
    } catch (error) {
      logError('data', 'Certificates by recipient request failed', error);
      throw error;
    }
  },

  /**
   * Get certificates by batch ID.
   * GET /certificates/batch
   */
  async getCertificatesByBatch(batchId: string): Promise<{ certificates: CertificateDisplay[] }> {
    const params = sanitizeQuery({ batchId: sanitizeString(batchId, { fieldName: 'batchId', maxLength: 64 }) });

    try {
      logDebug('data', 'Fetching certificates by batch', params);
      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/batch`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch batch certificates', 500);
    } catch (error) {
      logError('data', 'Certificates by batch request failed', error);
      throw error;
    }
  },

  /**
   * Search certificates by term.
   * GET /certificates/search
   */
  async searchCertificates(searchTerm: string, limit?: number): Promise<{ certificates: CertificateDisplay[] }> {
    const sanitizedTerm = sanitizeString(searchTerm, { fieldName: 'searchTerm', maxLength: 100 });
    const params = sanitizeQuery({
      searchTerm: sanitizedTerm,
      limit: sanitizeOptionalPositiveInteger(limit, { fieldName: 'limit', min: 1, max: 100 }),
    });

    try {
      logDebug('data', 'Searching certificates', params);
      const response = await api.get<ApiResponse<{ certificates: CertificateDisplay[] }>>(
        `${BASE_PATH}/search`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to search certificates', 500);
    } catch (error) {
      logError('data', 'Certificate search request failed', error);
      throw error;
    }
  },
};

export default certificateDataApi;

