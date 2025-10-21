import { integrationDataService } from '../core/integrationData.service';
import { connectionHealthService } from './connectionHealth.service';
import { EcommerceIntegrationError } from '../core/errors';
import type {
  EcommerceProvider,
  IntegrationAnalyticsReport,
  ProviderAnalyticsAdapter,
  ProviderAnalyticsSnapshot,
  ProviderFeatureAdapters
} from '../core/types';

interface AnalyticsDependencies {
  adapters?: Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;
}

interface AnalyticsOptions {
  includeHealthDetails?: boolean;
}

/**
 * Aggregates analytics insights across ecommerce integrations.
 */
export class EcommerceAnalyticsService {
  private readonly analyticsAdapters: Partial<Record<EcommerceProvider, ProviderAnalyticsAdapter>>;

  constructor(
    dependencies: AnalyticsDependencies = {},
    private readonly healthService = connectionHealthService
  ) {
    this.analyticsAdapters = Object.entries(dependencies.adapters ?? {}).reduce<
      Partial<Record<EcommerceProvider, ProviderAnalyticsAdapter>>
    >((acc, [provider, adapters]) => {
      if (adapters?.analytics) {
        acc[provider as EcommerceProvider] = adapters.analytics;
      }
      return acc;
    }, {});
  }

  async getIntegrationAnalytics(
    provider: EcommerceProvider,
    businessId: string,
    options: AnalyticsOptions = {}
  ): Promise<IntegrationAnalyticsReport> {
    const [integration, health, providerMetrics] = await Promise.all([
      integrationDataService.getIntegrationRecord(businessId, provider),
      this.healthService.getHealthReport(provider, businessId, {
        includeWebhookDiff: options.includeHealthDetails
      }),
      this.resolveProviderMetrics(provider, businessId)
    ]);

    const issues = [...health.issues];
    const recommendations = [...health.recommendations];

    if (!integration.connected) {
      issues.push('Integration not connected');
      recommendations.push('Reconnect to unlock ecommerce functionality');
    }

    return {
      provider,
      businessId,
      connected: integration.connected,
      connectedAt: integration.connectedAt ?? null,
      lastSyncAt: integration.lastSyncAt ?? null,
      health: health.overall,
      metrics: providerMetrics,
      issues,
      recommendations,
      metadata: {
        lastHealthCheck: health.lastTestedAt,
        webhookIssues: health.webhooks?.diff ? health.webhooks.diff.toUpdate.length + health.webhooks.diff.toCreate.length : 0,
        connectionHealthy: health.metadata?.connectionHealthy
      }
    };
  }

  private async resolveProviderMetrics(
    provider: EcommerceProvider,
    businessId: string
  ): Promise<ProviderAnalyticsSnapshot> {
    const adapter = this.analyticsAdapters[provider];
    if (!adapter) {
      return {};
    }

    try {
      return await adapter.getMetrics(businessId);
    } catch (error) {
      throw new EcommerceIntegrationError('Failed to retrieve provider analytics metrics', {
        provider,
        businessId,
        code: 'ANALYTICS_PROVIDER_ERROR',
        severity: 'medium',
        cause: error as Error
      });
    }
  }
}

export const analyticsService = new EcommerceAnalyticsService();
