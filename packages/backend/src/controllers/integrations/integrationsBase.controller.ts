// src/controllers/integrations/integrationsBase.controller.ts
// Shared helpers for integration oriented controllers

import { BaseController, BaseRequest } from '../core/base.controller';
import {
  getIntegrationsService,
  getEcommerceServices,
  getEcommerceIntegrationDataService,
  getEcommerceOAuthService,
  getEcommerceHttpClientFactoryService,
  getEcommerceWebhookRegistryService,
  getEcommerceCertificateDispatchService,
  getEcommerceOrderProcessingService,
  getEcommerceProductSyncService,
  getEcommerceWebhookOrchestratorService,
  getEcommerceConnectionHealthService,
  getEcommerceAnalyticsService,
  getEcommerceUtilities,
  getSupplyChainServices,
  getSupplyChainService,
  getSupplyChainDashboardService,
  getSupplyChainAnalyticsService
} from '../../services/container.service';
import type {
  EcommerceProvider,
  IntegrationAnalyticsReport,
  ProviderFeatureAdapters
} from '../../services/integrations/ecommerce';
import { EcommerceIntegrationError } from '../../services/integrations/ecommerce';
import {
  domainRegistryService,
  domainValidationService,
  domainVerificationService,
  domainDnsService,
  domainCertificateLifecycleService,
  domainHealthService,
  domainAnalyticsService,
  domainCacheService
} from '../../services/domains';

type IntegrationsService = ReturnType<typeof getIntegrationsService>;
type EcommerceServices = ReturnType<typeof getEcommerceServices>;
type SupplyChainServices = ReturnType<typeof getSupplyChainServices>;

interface NumberParseOptions {
  min?: number;
  max?: number;
}

/**
 * Base controller providing shared dependency wiring and helpers for integrations controllers.
 */
export abstract class IntegrationsBaseController extends BaseController {
  protected integrationsService: IntegrationsService = getIntegrationsService();

  // Ecommerce services
  protected ecommerceServices: EcommerceServices = getEcommerceServices();
  protected ecommerceIntegrationDataService = getEcommerceIntegrationDataService();
  protected ecommerceOAuthService = getEcommerceOAuthService();
  protected ecommerceHttpClientFactoryService = getEcommerceHttpClientFactoryService();
  protected ecommerceWebhookRegistryService = getEcommerceWebhookRegistryService();
  protected ecommerceCertificateDispatchService = getEcommerceCertificateDispatchService();
  protected ecommerceOrderProcessingService = getEcommerceOrderProcessingService();
  protected ecommerceProductSyncService = getEcommerceProductSyncService();
  protected ecommerceWebhookOrchestratorService = getEcommerceWebhookOrchestratorService();
  protected ecommerceConnectionHealthService = getEcommerceConnectionHealthService();
  protected ecommerceAnalyticsService = getEcommerceAnalyticsService();
  protected ecommerceUtilities = getEcommerceUtilities();

  // Domain / DNS integrations leverage existing domain services bundle
  protected domainServices = {
    registry: domainRegistryService,
    validation: domainValidationService,
    verification: domainVerificationService,
    dns: domainDnsService,
    certificateLifecycle: domainCertificateLifecycleService,
    health: domainHealthService,
    analytics: domainAnalyticsService,
    cache: domainCacheService
  };

  // Blockchain / supply chain integrations
  protected supplyChainServices: SupplyChainServices = getSupplyChainServices();
  protected supplyChainService = getSupplyChainService();
  protected supplyChainDashboardService = getSupplyChainDashboardService();
  protected supplyChainAnalyticsService = getSupplyChainAnalyticsService();

  /**
   * Resolve the active business identifier or throw when required.
   */
  protected requireBusinessId(req: BaseRequest): string {
    const candidate =
      req.businessId ??
      req.validatedParams?.businessId ??
      req.validatedBody?.businessId ??
      req.validatedQuery?.businessId ??
      (req.params as any)?.businessId ??
      (req.body as any)?.businessId ??
      (req.query as any)?.businessId;

    const businessId = this.parseString(candidate);
    if (!businessId) {
      throw { statusCode: 400, message: 'Business identifier is required for integration operations' };
    }
    return businessId;
  }

  /**
   * Parse and validate an ecommerce provider identifier.
   */
  protected requireEcommerceProvider(input: unknown): EcommerceProvider {
    const provider = this.parseString(input);
    if (!provider) {
      throw { statusCode: 400, message: 'Ecommerce provider is required' };
    }

    const supportedProviders = Object.keys(this.ecommerceServices.providers) as EcommerceProvider[];
    if (!supportedProviders.includes(provider as EcommerceProvider)) {
      throw { statusCode: 400, message: `Unsupported ecommerce provider: ${provider}` };
    }
    return provider as EcommerceProvider;
  }

  /**
   * Resolve feature adapters for a provider.
   */
  protected getProviderAdapters(provider: EcommerceProvider): ProviderFeatureAdapters | undefined {
    return this.ecommerceServices.providers[provider]?.adapters;
  }

  /**
   * Parse boolean values accepting string representations.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalised = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(normalised)) {
        return true;
      }
      if (['false', '0', 'no', 'n'].includes(normalised)) {
        return false;
      }
    }
    return fallback;
  }

  protected parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.parseBoolean(value);
  }

  protected parseString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  protected parseNumber(value: unknown, fallback: number, options: NumberParseOptions = {}): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    let result = parsed;
    if (options.min !== undefined && result < options.min) {
      result = options.min;
    }
    if (options.max !== undefined && result > options.max) {
      result = options.max;
    }
    return result;
  }

  protected parseOptionalNumber(value: unknown, options: NumberParseOptions = {}): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    if (options.min !== undefined && parsed < options.min) {
      return options.min;
    }
    if (options.max !== undefined && parsed > options.max) {
      return options.max;
    }
    return parsed;
  }

  protected parseDate(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value : undefined;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime()) ? parsed : undefined;
    }
    return undefined;
  }

  /**
   * Normalise ecommerce integration analytics payload before returning.
   */
  protected serialiseIntegrationAnalytics(report: IntegrationAnalyticsReport) {
    return {
      ...report,
      connectedAt: report.connectedAt instanceof Date ? report.connectedAt.toISOString() : report.connectedAt ?? undefined,
      lastSyncAt: report.lastSyncAt instanceof Date ? report.lastSyncAt.toISOString() : report.lastSyncAt ?? undefined
    };
  }

  /**
   * Translate ecommerce integration errors into HTTP responses.
   */
  protected handleIntegrationError(error: unknown): never {
    if (error instanceof EcommerceIntegrationError) {
      const statusCode = error.statusCode ?? 400;
      throw {
        statusCode,
        message: error.message,
        code: error.code ?? 'ECOMMERCE_INTEGRATION_ERROR',
        details: error.details
      };
    }
    throw error;
  }
}

export type IntegrationsBaseRequest = BaseRequest;

