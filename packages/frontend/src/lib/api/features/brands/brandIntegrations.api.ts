// src/lib/api/features/brands/brandIntegrations.api.ts
// Brand integrations API aligned with backend routes/features/brands/brandIntegrations.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BrandConfiguredIntegration,
  BrandIntegrationRemovalResult,
  BrandIntegrationStatistics,
  ConnectionTestResult,
  IntegrationStatus,
  ShopifyIntegrationData
} from '@/lib/types/features/brands';

const BASE_PATH = '/brand/integrations';

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

export interface ShopifyIntegrationInput extends ShopifyIntegrationData {
  syncProducts?: boolean;
  syncOrders?: boolean;
  configuredBy?: string;
}

export interface WooCommerceIntegrationInput {
  wooDomain: string;
  wooConsumerKey: string;
  wooConsumerSecret: string;
}

export interface WixIntegrationInput {
  wixDomain: string;
  wixApiKey: string;
  wixRefreshToken?: string;
}

export const brandIntegrationsApi = {
  /**
   * Retrieve current integration status.
   * GET /api/brand/integrations/status
   */
  async getStatus(): Promise<IntegrationStatus> {
    try {
      const response = await api.get<ApiResponse<{ status: IntegrationStatus }>>(
        `${BASE_PATH}/status`,
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch integration status',
        500,
      );
      return status;
    } catch (error) {
      console.error('Brand integration status fetch error:', error);
      throw error;
    }
  },

  /**
   * Test Shopify connection.
   * POST /api/brand/integrations/shopify/test
   */
  async testShopifyConnection(
    data: ShopifyIntegrationData,
  ): Promise<ConnectionTestResult> {
    try {
      const response = await api.post<ApiResponse<{ result: ConnectionTestResult }>>(
        `${BASE_PATH}/shopify/test`,
        baseApi.sanitizeRequestData(data),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to test Shopify connection',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand Shopify integration test error:', error);
      throw error;
    }
  },

  /**
   * Configure Shopify integration.
   * POST /api/brand/integrations/shopify
   */
  async configureShopifyIntegration(
    data: ShopifyIntegrationInput,
  ): Promise<BrandConfiguredIntegration> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandConfiguredIntegration }>>(
        `${BASE_PATH}/shopify`,
        baseApi.sanitizeRequestData(data),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to configure Shopify integration',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand Shopify integration configure error:', error);
      throw error;
    }
  },

  /**
   * Configure WooCommerce integration.
   * POST /api/brand/integrations/woocommerce
   */
  async configureWooCommerceIntegration(
    credentials: WooCommerceIntegrationInput,
  ): Promise<BrandConfiguredIntegration> {
    try {
      const response = await api.post<ApiResponse<{ message: string; domain: string }>>(
        `${BASE_PATH}/woocommerce`,
        baseApi.sanitizeRequestData(credentials),
      );
      const payload = baseApi.handleResponse(
        response,
        'Failed to configure WooCommerce integration',
        400,
      );
      return {
        status: 'active',
        configuredAt: new Date().toISOString(),
        message: payload.message,
        domain: payload.domain,
      };
    } catch (error) {
      console.error('Brand WooCommerce integration configure error:', error);
      throw error;
    }
  },

  /**
   * Configure Wix integration.
   * POST /api/brand/integrations/wix
   */
  async configureWixIntegration(
    credentials: WixIntegrationInput,
  ): Promise<BrandConfiguredIntegration> {
    try {
      const response = await api.post<ApiResponse<{ message: string; domain: string }>>(
        `${BASE_PATH}/wix`,
        baseApi.sanitizeRequestData(credentials),
      );
      const payload = baseApi.handleResponse(
        response,
        'Failed to configure Wix integration',
        400,
      );
      return {
        status: 'active',
        configuredAt: new Date().toISOString(),
        message: payload.message,
        domain: payload.domain,
      };
    } catch (error) {
      console.error('Brand Wix integration configure error:', error);
      throw error;
    }
  },

  /**
   * Update existing integration credentials.
   * PUT /api/brand/integrations/:type
   */
  async updateIntegration(
    type: string,
    credentials: Record<string, unknown>,
  ): Promise<string> {
    try {
      const response = await api.put<ApiResponse<{ message: string }>>(
        `${BASE_PATH}/${encodeURIComponent(type)}`,
        baseApi.sanitizeRequestData({ credentials }),
      );
      const { message } = baseApi.handleResponse(
        response,
        'Failed to update integration',
        400,
      );
      return message;
    } catch (error) {
      console.error('Brand integration update error:', error);
      throw error;
    }
  },

  /**
   * Remove an integration.
   * DELETE /api/brand/integrations/:type
   */
  async removeIntegration(type: string): Promise<BrandIntegrationRemovalResult> {
    try {
      const response = await api.delete<ApiResponse<{ result: BrandIntegrationRemovalResult }>>(
        `${BASE_PATH}/${encodeURIComponent(type)}`,
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to remove integration',
        400,
      );
      return result;
    } catch (error) {
      console.error('Brand integration removal error:', error);
      throw error;
    }
  },

  /**
   * Retrieve configured integrations.
   * GET /api/brand/integrations/configured
   */
  async getConfiguredIntegrations(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<{ configured: string[] }>>(
        `${BASE_PATH}/configured`,
      );
      const { configured } = baseApi.handleResponse(
        response,
        'Failed to fetch configured integrations',
        500,
      );
      return configured;
    } catch (error) {
      console.error('Brand configured integrations fetch error:', error);
      throw error;
    }
  },

  /**
   * Retrieve available integrations for current plan.
   * GET /api/brand/integrations/available
   */
  async getAvailableIntegrations(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<{ available: string[] }>>(
        `${BASE_PATH}/available`,
      );
      const { available } = baseApi.handleResponse(
        response,
        'Failed to fetch available integrations',
        500,
      );
      return available;
    } catch (error) {
      console.error('Brand available integrations fetch error:', error);
      throw error;
    }
  },

  /**
   * Check if current plan has permission for an integration.
   * GET /api/brand/integrations/permissions
   */
  async checkIntegrationPermissions(integrationType: string): Promise<boolean> {
    try {
      const response = await api.get<ApiResponse<{ hasPermission: boolean }>>(
        `${BASE_PATH}/permissions`,
        { params: { integrationType } },
      );
      const { hasPermission } = baseApi.handleResponse(
        response,
        'Failed to check integration permissions',
        400,
      );
      return hasPermission;
    } catch (error) {
      console.error('Brand integration permission check error:', error);
      throw error;
    }
  },

  /**
   * Retrieve integration statistics.
   * GET /api/brand/integrations/statistics
   */
  async getIntegrationStatistics(): Promise<BrandIntegrationStatistics> {
    try {
      const response = await api.get<ApiResponse<{ stats: BrandIntegrationStatistics }>>(
        `${BASE_PATH}/statistics`,
      );
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch integration statistics',
        500,
      );
      return stats;
    } catch (error) {
      console.error('Brand integration statistics fetch error:', error);
      throw error;
    }
  },
};

export default brandIntegrationsApi;


