// src/lib/api/features/brands/brandSettings.api.ts
// Brand settings API aligned with backend routes/features/brands/brandSettings.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BrandDomainInstruction,
  BrandDomainValidationResult,
  BrandSettingsExportData,
  BrandSettingsFormData,
  BrandSettingsHealth,
  BrandSettingsSyncResult,
  BrandSettingsTestResult,
  EnhancedBrandSettings,
  IntegrationStatus,
  UpdateBrandSettingsInput,
  WalletValidationResult
} from '@/lib/types/features/brands';

const BASE_PATH = '/brand-settings';

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

export interface IntegrationTestInput {
  integrationType: string;
  credentials: Record<string, unknown>;
}

export interface DomainValidationInput {
  domain: string;
  subdomain?: string;
}

export interface WalletValidationInput {
  walletAddress: string;
  signature?: string;
  message?: string;
}

export interface ExportSettingsParams {
  format: 'json' | 'yaml' | 'csv' | 'xml';
  includeSecrets?: boolean;
}

export interface ImportSettingsPayload {
  settings: unknown;
  format: 'json' | 'yaml' | 'csv' | 'xml';
  overwrite?: boolean;
}

export interface IntegrationSyncPayload {
  integrationType: string;
}

export const brandSettingsApi = {
  /**
   * Retrieve brand settings.
   * GET /api/brand-settings
   */
  async getSettings(): Promise<EnhancedBrandSettings> {
    try {
      const response = await api.get<ApiResponse<{ settings: EnhancedBrandSettings }>>(
        BASE_PATH,
      );
      const { settings } = baseApi.handleResponse(
        response,
        'Failed to fetch brand settings',
        500,
      );
      return settings;
    } catch (error) {
      console.error('Brand settings fetch error:', error);
      throw error;
    }
  },

  /**
   * Update brand settings.
   * PUT /api/brand-settings
   */
  async updateSettings(
    payload: Partial<BrandSettingsFormData> & Partial<UpdateBrandSettingsInput>,
  ): Promise<EnhancedBrandSettings> {
    try {
      const response = await api.put<ApiResponse<{ settings: EnhancedBrandSettings }>>(
        BASE_PATH,
        baseApi.sanitizeRequestData(payload),
      );
      const { settings } = baseApi.handleResponse(
        response,
        'Failed to update brand settings',
        400,
      );
      return settings;
    } catch (error) {
      console.error('Brand settings update error:', error);
      throw error;
    }
  },

  /**
   * Test third-party integration credentials.
   * POST /api/brand-settings/integration/test
   */
  async testIntegration(input: IntegrationTestInput): Promise<BrandSettingsTestResult> {
    try {
      const response = await api.post<ApiResponse<{ testResult: BrandSettingsTestResult }>>(
        `${BASE_PATH}/integration/test`,
        baseApi.sanitizeRequestData(input),
      );
      const { testResult } = baseApi.handleResponse(
        response,
        'Failed to test integration credentials',
        400,
      );
      return testResult;
    } catch (error) {
      console.error('Brand integration test error:', error);
      throw error;
    }
  },

  /**
   * Validate custom domain.
   * POST /api/brand-settings/domain/validate
   */
  async validateDomain(input: DomainValidationInput): Promise<BrandDomainValidationResult> {
    try {
      const response = await api.post<ApiResponse<{ validationResult: BrandDomainValidationResult }>>(
        `${BASE_PATH}/domain/validate`,
        baseApi.sanitizeRequestData(input),
      );
      const { validationResult } = baseApi.handleResponse(
        response,
        'Failed to validate domain',
        400,
      );
      return validationResult;
    } catch (error) {
      console.error('Brand domain validation error:', error);
      throw error;
    }
  },

  /**
   * Validate wallet address.
   * POST /api/brand-settings/wallet/validate
   */
  async validateWallet(input: WalletValidationInput): Promise<WalletValidationResult> {
    try {
      const response = await api.post<ApiResponse<{ validationResult: WalletValidationResult }>>(
        `${BASE_PATH}/wallet/validate`,
        baseApi.sanitizeRequestData(input),
      );
      const { validationResult } = baseApi.handleResponse(
        response,
        'Failed to validate wallet address',
        400,
      );
      return validationResult;
    } catch (error) {
      console.error('Brand wallet validation error:', error);
      throw error;
    }
  },

  /**
   * Export brand settings.
   * GET /api/brand-settings/export
   */
  async exportSettings(params: ExportSettingsParams): Promise<BrandSettingsExportData> {
    try {
      const response = await api.get<ApiResponse<{ exportData: BrandSettingsExportData }>>(
        `${BASE_PATH}/export`,
        { params },
      );
      const { exportData } = baseApi.handleResponse(
        response,
        'Failed to export brand settings',
        500,
      );
      return exportData;
    } catch (error) {
      console.error('Brand settings export error:', error);
      throw error;
    }
  },

  /**
   * Import brand settings.
   * POST /api/brand-settings/import
   */
  async importSettings(payload: ImportSettingsPayload): Promise<void> {
    try {
      await api.post<ApiResponse<unknown>>(
        `${BASE_PATH}/import`,
        baseApi.sanitizeRequestData(payload),
      );
    } catch (error) {
      console.error('Brand settings import error:', error);
      throw error;
    }
  },

  /**
   * Retrieve integration status from settings service.
   * GET /api/brand-settings/integrations/status
   */
  async getIntegrationStatus(): Promise<IntegrationStatus> {
    try {
      const response = await api.get<ApiResponse<{ status: IntegrationStatus }>>(
        `${BASE_PATH}/integrations/status`,
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch settings integration status',
        500,
      );
      return status;
    } catch (error) {
      console.error('Brand settings integration status fetch error:', error);
      throw error;
    }
  },

  /**
   * Trigger integration sync.
   * POST /api/brand-settings/integrations/sync
   */
  async syncIntegration(payload: IntegrationSyncPayload): Promise<BrandSettingsSyncResult> {
    try {
      const response = await api.post<ApiResponse<{ syncResult: BrandSettingsSyncResult }>>(
        `${BASE_PATH}/integrations/sync`,
        baseApi.sanitizeRequestData(payload),
      );
      const { syncResult } = baseApi.handleResponse(
        response,
        'Failed to sync integration',
        400,
      );
      return syncResult;
    } catch (error) {
      console.error('Brand integration sync error:', error);
      throw error;
    }
  },

  /**
   * Retrieve domain setup instructions.
   * GET /api/brand-settings/domain/setup-instructions
   */
  async getDomainSetupInstructions(): Promise<BrandDomainInstruction> {
    try {
      const response = await api.get<ApiResponse<{ instructions: BrandDomainInstruction }>>(
        `${BASE_PATH}/domain/setup-instructions`,
      );
      const { instructions } = baseApi.handleResponse(
        response,
        'Failed to fetch domain setup instructions',
        500,
      );
      return instructions;
    } catch (error) {
      console.error('Brand domain setup instructions fetch error:', error);
      throw error;
    }
  },

  /**
   * Retrieve settings health information.
   * GET /api/brand-settings/health
   */
  async getSettingsHealth(): Promise<BrandSettingsHealth> {
    try {
      const response = await api.get<ApiResponse<{ health: BrandSettingsHealth }>>(
        `${BASE_PATH}/health`,
      );
      const { health } = baseApi.handleResponse(
        response,
        'Failed to fetch brand settings health',
        500,
      );
      return health;
    } catch (error) {
      console.error('Brand settings health fetch error:', error);
      throw error;
    }
  },
};

export default brandSettingsApi;


