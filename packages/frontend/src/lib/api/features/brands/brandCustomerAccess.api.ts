// src/lib/api/features/brands/brandCustomerAccess.api.ts
// Brand customer access API aligned with backend routes/features/brands/brandCustomerAccess.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse, PaginatedResponse } from '@/lib/types/core';
import type {
  BrandCustomerAnalytics,
  BrandCustomerBulkUpdateResult,
  BrandCustomerDeleteResult,
  BrandCustomerEmailAccessCheck,
  BrandCustomerGrantResult,
  BrandCustomerImportResult,
  BrandCustomerSyncResult,
  CustomerFilters,
  CustomerImportData,
  CustomerSummary,
  EmailGatingSettings
} from '@/lib/types/features/brands';

const BASE_PATH = '/brand/customer-access';

const clean = (input?: Record<string, unknown>) => {
  if (!input) {
    return undefined;
  }
  return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const toFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};

const normalizeAnalytics = (analytics: any): BrandCustomerAnalytics => {
  const overview = analytics?.overview ?? {
    total: 0,
    active: 0,
    registered: 0,
    totalVotes: 0,
    vipCustomers: 0,
  };

  const trends = Array.isArray(analytics?.trends)
    ? analytics.trends.map((item: any) => ({
        year: item?._id?.year ?? item?.year ?? 0,
        month: item?._id?.month ?? item?.month ?? 0,
        newCustomers: item?.newCustomers ?? 0,
        activeCustomers: item?.activeCustomers ?? 0,
      }))
    : [];

  return {
    overview,
    engagement: analytics?.engagement ?? {},
    sources: analytics?.sources ?? {},
    trends,
  };
};

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'active' | 'revoked' | 'deleted';
  sortBy?: 'createdAt' | 'lastVotingAccess' | 'totalVotes' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface EmailGatingSettingsUpdate {
  enabled: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  customMessage?: string;
}

export interface CustomerBulkUpdatePayload {
  customerIds: string[];
  status?: 'active' | 'inactive' | 'revoked';
  metadata?: Record<string, unknown>;
}

export const brandCustomerAccessApi = {
  /**
   * Check if an email has access.
   * GET /api/brand/customer-access/email/:email
   */
  async checkEmailAccess(email: string): Promise<BrandCustomerEmailAccessCheck> {
    try {
      const response = await api.get<ApiResponse<{ result: BrandCustomerEmailAccessCheck }>>(
        `${BASE_PATH}/email/${encodeURIComponent(email)}`,
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to check customer email access',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer email access check error:', error);
      throw error;
    }
  },

  /**
   * Grant voting access to a customer email.
   * POST /api/brand/customer-access/voting/grant
   */
  async grantVotingAccess(email: string): Promise<BrandCustomerGrantResult> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandCustomerGrantResult }>>(
        `${BASE_PATH}/voting/grant`,
        { email },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to grant voting access',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer voting access grant error:', error);
      throw error;
    }
  },

  /**
   * Add customers manually.
   * POST /api/brand/customer-access/customers
   */
  async addCustomers(customers: CustomerImportData[]): Promise<BrandCustomerImportResult> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandCustomerImportResult }>>(
        `${BASE_PATH}/customers`,
        { customers },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to add customers',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer add error:', error);
      throw error;
    }
  },

  /**
   * Import customers from CSV file.
   * POST /api/brand/customer-access/customers/import
   */
  async importCustomersFromCsv(file: File): Promise<BrandCustomerImportResult> {
    try {
      const response = await api.postFormData<ApiResponse<{ result: BrandCustomerImportResult }>>(
        `${BASE_PATH}/customers/import`,
        toFormData(file),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to import customers from CSV',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer CSV import error:', error);
      throw error;
    }
  },

  /**
   * Sync customers from Shopify.
   * POST /api/brand/customer-access/customers/sync/shopify
   */
  async syncFromShopify(): Promise<BrandCustomerSyncResult> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandCustomerSyncResult }>>(
        `${BASE_PATH}/customers/sync/shopify`,
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to sync customers from Shopify',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer Shopify sync error:', error);
      throw error;
    }
  },

  /**
   * Retrieve paginated customers.
   * GET /api/brand/customer-access/customers
   */
  async getCustomers(
    params?: CustomerListParams,
  ): Promise<PaginatedResponse<CustomerSummary>> {
    try {
      const query = clean(params);
      const response = await api.get<ApiResponse<PaginatedResponse<CustomerSummary>>>(
        `${BASE_PATH}/customers`,
        { params: query },
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch customers',
        500,
      );
    } catch (error) {
      console.error('Brand customer list fetch error:', error);
      throw error;
    }
  },

  /**
   * Retrieve email gating settings.
   * GET /api/brand/customer-access/settings
   */
  async getEmailGatingSettings(): Promise<EmailGatingSettings> {
    try {
      const response = await api.get<ApiResponse<{ settings: EmailGatingSettings }>>(
        `${BASE_PATH}/settings`,
      );
      const { settings } = baseApi.handleResponse(
        response,
        'Failed to fetch email gating settings',
        500,
      );
      return settings;
    } catch (error) {
      console.error('Brand email gating settings fetch error:', error);
      throw error;
    }
  },

  /**
   * Update email gating settings.
   * PUT /api/brand/customer-access/settings
   */
  async updateEmailGatingSettings(
    payload: EmailGatingSettingsUpdate,
  ): Promise<EmailGatingSettings> {
    try {
      const response = await api.put<ApiResponse<{ settings: EmailGatingSettings }>>(
        `${BASE_PATH}/settings`,
        baseApi.sanitizeRequestData(payload),
      );
      const { settings } = baseApi.handleResponse(
        response,
        'Failed to update email gating settings',
        400,
      );
      return settings;
    } catch (error) {
      console.error('Brand email gating settings update error:', error);
      throw error;
    }
  },

  /**
   * Revoke customer access.
   * POST /api/brand/customer-access/customers/:customerId/revoke
   */
  async revokeCustomerAccess(customerId: string): Promise<CustomerSummary | undefined> {
    try {
      const response = await api.post<ApiResponse<{ customer?: CustomerSummary }>>(
        `${BASE_PATH}/customers/${customerId}/revoke`,
      );
      const { customer } = baseApi.handleResponse(
        response,
        'Failed to revoke customer access',
        400,
      );
      return customer;
    } catch (error) {
      console.error('Brand customer access revoke error:', error);
      throw error;
    }
  },

  /**
   * Restore customer access.
   * POST /api/brand/customer-access/customers/:customerId/restore
   */
  async restoreCustomerAccess(customerId: string): Promise<CustomerSummary | undefined> {
    try {
      const response = await api.post<ApiResponse<{ customer?: CustomerSummary }>>(
        `${BASE_PATH}/customers/${customerId}/restore`,
      );
      const { customer } = baseApi.handleResponse(
        response,
        'Failed to restore customer access',
        400,
      );
      return customer;
    } catch (error) {
      console.error('Brand customer access restore error:', error);
      throw error;
    }
  },

  /**
   * Delete customer.
   * DELETE /api/brand/customer-access/customers/:customerId
   */
  async deleteCustomer(customerId: string): Promise<BrandCustomerDeleteResult> {
    try {
      const response = await api.delete<ApiResponse<{ result: BrandCustomerDeleteResult }>>(
        `${BASE_PATH}/customers/${customerId}`,
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to delete customer',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer delete error:', error);
      throw error;
    }
  },

  /**
   * Retrieve customer analytics snapshot.
   * GET /api/brand/customer-access/analytics
   */
  async getCustomerAnalytics(): Promise<BrandCustomerAnalytics> {
    try {
      const response = await api.get<ApiResponse<{ analytics: any }>>(
        `${BASE_PATH}/analytics`,
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch customer analytics',
        500,
      );
      return normalizeAnalytics(analytics);
    } catch (error) {
      console.error('Brand customer analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Bulk update customer access.
   * POST /api/brand/customer-access/customers/bulk-update
   */
  async bulkUpdateCustomerAccess(
    payload: CustomerBulkUpdatePayload,
  ): Promise<BrandCustomerBulkUpdateResult> {
    try {
      const body = {
        customerIds: payload.customerIds,
        updates: clean({
          status: payload.status,
          metadata: payload.metadata,
        }),
      };

      const response = await api.post<ApiResponse<{ result: BrandCustomerBulkUpdateResult }>>(
        `${BASE_PATH}/customers/bulk-update`,
        baseApi.sanitizeRequestData(body),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to bulk update customer access',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand customer bulk update error:', error);
      throw error;
    }
  },
};

export default brandCustomerAccessApi;


