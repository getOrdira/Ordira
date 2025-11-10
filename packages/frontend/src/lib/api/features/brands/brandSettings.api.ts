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
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/brand-settings';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createBrandLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'brands',
  method,
  endpoint,
  ...context
});

const VOID_RESPONSE_OPTIONS = { requireData: false } as const;

const toQueryParams = <T extends object>(params?: T) => {
  if (!params) {
    return undefined;
  }
  return baseApi.sanitizeQueryParams({ ...(params as Record<string, unknown>) });
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
      throw handleApiError(
        error,
        createBrandLogContext('GET', BASE_PATH),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('PUT', BASE_PATH),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/integration/test`, {
          integrationType: input.integrationType,
        }),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/domain/validate`, {
          domain: input.domain,
          subdomain: input.subdomain,
        }),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/wallet/validate`, {
          hasSignature: Boolean(input.signature),
        }),
      );
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
        { params: toQueryParams(params) },
      );
      const { exportData } = baseApi.handleResponse(
        response,
        'Failed to export brand settings',
        500,
      );
      return exportData;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/export`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Import brand settings.
   * POST /api/brand-settings/import
   */
  async importSettings(payload: ImportSettingsPayload): Promise<void> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        `${BASE_PATH}/import`,
        baseApi.sanitizeRequestData(payload),
      );
      baseApi.handleResponse(response, 'Failed to import brand settings', 400, VOID_RESPONSE_OPTIONS);
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/import`, { format: payload.format }),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/integrations/status`),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/integrations/sync`, {
          integrationType: payload.integrationType,
        }),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/domain/setup-instructions`),
      );
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
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/health`),
      );
    }
  },
};

export default brandSettingsApi;


