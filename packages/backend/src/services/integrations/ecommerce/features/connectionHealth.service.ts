import { integrationDataService } from '../core/integrationData.service';
import { httpClientFactoryService } from '../core/httpClientFactory.service';
import { webhookRegistryService } from '../core/webhookRegistry.service';
import type {
  EcommerceProvider,
  IntegrationRecord,
  ProviderFeatureAdapters,
  ProviderWebhookRecord,
  WebhookDiff
} from '../core/types';

export interface ConnectionHealthReport {
  provider: EcommerceProvider;
  businessId: string;
  overall: 'excellent' | 'good' | 'poor' | 'critical';
  connected: boolean;
  lastSyncAt?: Date | null;
  lastTestedAt: Date;
  issues: string[];
  recommendations: string[];
  webhooks?: {
    diff: WebhookDiff;
  };
  metadata?: Record<string, unknown>;
}

export interface ConnectionHealthOptions {
  includeWebhookDiff?: boolean;
  expectedWebhooks?: Parameters<typeof webhookRegistryService.diffWebhooks>[0];
}

/**
 * Generates health assessments for ecommerce integrations.
 */
export class EcommerceConnectionHealthService {
  constructor(
    private readonly adapterRegistry: Partial<Record<EcommerceProvider, ProviderFeatureAdapters>> = {}
  ) {}

  async getHealthReport(
    provider: EcommerceProvider,
    businessId: string,
    options: ConnectionHealthOptions = {}
  ): Promise<ConnectionHealthReport> {
    const integrationRecord = await integrationDataService.getIntegrationRecord(businessId, provider);
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!integrationRecord.connected) {
      issues.push('Integration is not connected');
      recommendations.push('Reconnect to enable ecommerce workflows');
    }

    if (!integrationRecord.domain) {
      issues.push('Integration domain is missing');
      recommendations.push('Update integration settings with the storefront domain');
    }

    const lastTestedAt = new Date();
    const metadata: Record<string, unknown> = {
      domain: integrationRecord.domain,
      connectedAt: integrationRecord.connectedAt,
      lastSyncAt: integrationRecord.lastSyncAt
    };

    const client = httpClientFactoryService.createClient({
      provider,
      businessId,
      baseURL: integrationRecord.domain ?? '',
      timeoutMs: 5_000,
      logRequests: false
    });

    const connectionHealthy = await this.performProviderConnectivityCheck(
      provider,
      businessId,
      client,
      integrationRecord,
      issues
    );
    metadata.connectionHealthy = connectionHealthy;

    let webhookDiff: WebhookDiff | undefined;
    if (options.includeWebhookDiff && options.expectedWebhooks && integrationRecord.connected) {
      const existing = await this.fetchExistingWebhooks(provider, businessId);
      webhookDiff = webhookRegistryService.diffWebhooks(options.expectedWebhooks, existing);

      if (webhookDiff.toCreate.length > 0 || webhookDiff.toUpdate.length > 0) {
        issues.push('Webhook setup requires attention');
        recommendations.push('Run webhook reconciliation to ensure reliable event delivery');
      }
    }

    const overall = this.evaluateOverallHealth({
      connected: integrationRecord.connected,
      connectionHealthy,
      webhookDiff,
      issues
    });

    return {
      provider,
      businessId,
      overall,
      connected: integrationRecord.connected,
      lastSyncAt: integrationRecord.lastSyncAt,
      lastTestedAt,
      issues,
      recommendations,
      metadata,
      webhooks: webhookDiff ? { diff: webhookDiff } : undefined
    };
  }

  private evaluateOverallHealth(input: {
    connected: boolean;
    connectionHealthy: boolean;
    webhookDiff?: WebhookDiff;
    issues: string[];
  }): ConnectionHealthReport['overall'] {
    if (!input.connected) {
      return 'critical';
    }

    if (!input.connectionHealthy) {
      return 'poor';
    }

    if (input.webhookDiff && input.webhookDiff.toCreate.length + input.webhookDiff.toUpdate.length > 0) {
      return 'good';
    }

    if (input.issues.length === 0) {
      return 'excellent';
    }

    return 'good';
  }

  private async performProviderConnectivityCheck(
    provider: EcommerceProvider,
    businessId: string,
    client: ReturnType<typeof httpClientFactoryService.createClient>,
    record: IntegrationRecord,
    issues: string[]
  ): Promise<boolean> {
    const connectionAdapter = this.adapterRegistry[provider]?.connection;
    if (connectionAdapter) {
      try {
        return await connectionAdapter.testConnection(businessId);
      } catch (error) {
        issues.push('Provider connection adapter reported failure');
        return false;
      }
    }

    try {
      switch (provider) {
        case 'shopify':
          if (!record.domain) {
            return false;
          }
          await client.get('/admin/api/2024-01/shop.json');
          break;
        case 'wix':
          await client.get('https://www.wixapis.com/apps/v1/app-instance');
          break;
        case 'woocommerce':
          await client.get('/wp-json/wc/v3');
          break;
        default:
          throw new Error(`Unsupported provider ${provider}`);
      }

      return true;
    } catch (error) {
      issues.push('API connectivity test failed');
      return false;
    }
  }

  private async fetchExistingWebhooks(
    provider: EcommerceProvider,
    businessId: string
  ): Promise<ProviderWebhookRecord[]> {
    const adapter = this.adapterRegistry[provider]?.webhooks;
    if (adapter) {
      return adapter.list(businessId);
    }

    switch (provider) {
      case 'shopify': {
        const record = await integrationDataService.getIntegrationRecord(businessId, provider, { includeSecrets: true });
        const client = httpClientFactoryService.createClient({
          provider,
          businessId,
          baseURL: `https://${record.domain}`,
          bearerToken: (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'accessToken' in record.metadata.secrets) 
            ? record.metadata.secrets.accessToken as string 
            : undefined,
          logRequests: false
        });
        const response = await client.get('/admin/api/2024-01/webhooks.json');
        return (response.data.webhooks ?? []).map((webhook: any) => ({
          id: webhook.id,
          topic: webhook.topic,
          address: webhook.address
        }));
      }
      case 'wix': {
        const record = await integrationDataService.getIntegrationRecord(businessId, provider, { includeSecrets: true });
        const client = httpClientFactoryService.createClient({
          provider,
          businessId,
          baseURL: 'https://www.wixapis.com/webhooks/v1',
          bearerToken: (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'accessToken' in record.metadata.secrets) 
            ? record.metadata.secrets.accessToken as string 
            : undefined,
          logRequests: false
        });
        const response = await client.get('/webhooks');
        return (response.data.webhooks ?? []).map((webhook: any) => ({
          id: webhook._id,
          topic: webhook.eventType,
          address: webhook.url,
          status: webhook.status
        }));
      }
      case 'woocommerce': {
        const record = await integrationDataService.getIntegrationRecord(businessId, provider, { includeSecrets: true });
        const client = httpClientFactoryService.createClient({
          provider,
          businessId,
          baseURL: `https://${record.domain}`,
          auth: {
            username: (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'accessToken' in record.metadata.secrets) 
              ? record.metadata.secrets.accessToken as string 
              : '',
            password: (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'secret' in record.metadata.secrets) 
              ? record.metadata.secrets.secret as string 
              : ''
          },
          logRequests: false
        });
        const response = await client.get('/wp-json/wc/v3/webhooks');
        return (response.data ?? []).map((webhook: any) => ({
          id: webhook.id,
          topic: webhook.topic,
          address: webhook.delivery_url,
          status: webhook.status
        }));
      }
      default:
        return [];
    }
  }
}

export const connectionHealthService = new EcommerceConnectionHealthService();
