import { webhookRegistryService } from '../core/webhookRegistry.service';
import { EcommerceIntegrationError } from '../core/errors';
import type {
  EcommerceProvider,
  ExpectedWebhookDefinition,
  ProviderFeatureAdapters,
  ProviderWebhookAdapter,
  ProviderWebhookRecord,
  WebhookReconciliationResult
} from '../core/types';

interface WebhookOrchestratorDependencies {
  adapters?: Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;
}

interface ReconcileOptions {
  dryRun?: boolean;
}

/**
 * Handles reconciliation of provider webhooks with the desired configuration.
 */
export class EcommerceWebhookOrchestratorService {
  private readonly webhookAdapters: Partial<Record<EcommerceProvider, ProviderWebhookAdapter>>;

  constructor(dependencies: WebhookOrchestratorDependencies = {}) {
    this.webhookAdapters = Object.entries(dependencies.adapters ?? {}).reduce<
      Partial<Record<EcommerceProvider, ProviderWebhookAdapter>>
    >((acc, [provider, adapters]) => {
      if (adapters?.webhooks) {
        acc[provider as EcommerceProvider] = adapters.webhooks;
      }
      return acc;
    }, {});
  }

  async reconcile(
    provider: EcommerceProvider,
    businessId: string,
    expected: ExpectedWebhookDefinition[],
    options: ReconcileOptions = {}
  ): Promise<WebhookReconciliationResult> {
    if (!expected || expected.length === 0) {
      throw new EcommerceIntegrationError('No webhook definitions supplied for reconciliation', {
        provider,
        businessId,
        code: 'EMPTY_WEBHOOK_DEFINITIONS',
        statusCode: 400,
        severity: 'low'
      });
    }

    const adapter = this.getWebhookAdapter(provider);
    const existing = await adapter.list(businessId);
    const diff = webhookRegistryService.diffWebhooks(expected, existing);

    const result: WebhookReconciliationResult = {
      provider,
      businessId,
      created: 0,
      updated: 0,
      deleted: 0,
      issues: [],
      diff
    };

    if (options.dryRun) {
      return result;
    }

    for (const webhook of diff.toCreate) {
      await adapter.register(businessId, webhook);
      result.created++;
    }

    for (const { current, desired } of diff.toUpdate) {
      const updated = await this.updateWebhook(adapter, businessId, current, desired, result);
      if (updated) {
        result.updated++;
      }
    }

    for (const webhook of diff.toDelete) {
      await adapter.remove(businessId, webhook);
      result.deleted++;
    }

    return result;
  }

  private async updateWebhook(
    adapter: ProviderWebhookAdapter,
    businessId: string,
    current: ProviderWebhookRecord,
    desired: ExpectedWebhookDefinition,
    result: WebhookReconciliationResult
  ): Promise<boolean> {
    if (adapter.update) {
      await adapter.update(businessId, current, desired);
      return true;
    }

    // When the provider does not support in-place updates we remove and recreate.
    await adapter.remove(businessId, current);
    await adapter.register(businessId, desired);

    result.issues.push(
      `Webhook ${current.topic} recreated instead of updated due to provider limitations`
    );
    return true;
  }

  private getWebhookAdapter(provider: EcommerceProvider): ProviderWebhookAdapter {
    const adapter = this.webhookAdapters[provider];
    if (!adapter) {
      throw new EcommerceIntegrationError('Webhook adapter not registered for provider', {
        provider,
        code: 'WEBHOOK_ADAPTER_MISSING',
        statusCode: 501,
        severity: 'medium'
      });
    }
    return adapter;
  }
}

export const webhookOrchestratorService = new EcommerceWebhookOrchestratorService();
