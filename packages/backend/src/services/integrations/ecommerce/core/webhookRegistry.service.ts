import { logger } from '../../../../utils/logger';
import { EcommerceIntegrationError } from './errors';
import type {
  EcommerceProvider,
  ExpectedWebhookDefinition,
  ProviderWebhookRecord,
  WebhookDiff
} from './types';

/**
 * Utility service responsible for deriving webhook registration plans across providers.
 */
export class WebhookRegistryService {
  /**
   * Builds a fully qualified callback URL for a provider webhook.
   */
  buildCallbackUrl(
    appUrl: string,
    provider: EcommerceProvider,
    relativePath: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): string {
    if (!appUrl) {
      throw new EcommerceIntegrationError('Application URL is required to build webhook callback URL', {
        provider,
        code: 'INVALID_APP_URL',
        severity: 'high'
      });
    }

    const url = new URL(appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
    const providerBasePath = `api/integrations/${provider}/webhooks`;
    const normalisedRelative = relativePath.replace(/^\//, '');

    url.pathname = [url.pathname.replace(/\/+$/, ''), providerBasePath, normalisedRelative]
      .filter(Boolean)
      .join('/');

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value === undefined) {
          return;
        }
        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Produce a diff between expected webhook definitions and those already registered remotely.
   */
  diffWebhooks(
    expected: ExpectedWebhookDefinition[],
    existing: ProviderWebhookRecord[]
  ): WebhookDiff {
    const existingMap = new Map<string, ProviderWebhookRecord>();

    for (const record of existing) {
      existingMap.set(this.normaliseTopic(record.topic), record);
    }

    const toCreate: ExpectedWebhookDefinition[] = [];
    const toUpdate: WebhookDiff['toUpdate'] = [];
    const unchanged: ProviderWebhookRecord[] = [];

    for (const desired of expected) {
      this.validateDefinition(desired);

      const topicKey = this.normaliseTopic(desired.topic);
      const current = existingMap.get(topicKey);

      if (!current) {
        toCreate.push(desired);
        continue;
      }

      if (this.requiresUpdate(current, desired)) {
        toUpdate.push({ current, desired });
      } else {
        unchanged.push(current);
      }

      existingMap.delete(topicKey);
    }

    const toDelete = Array.from(existingMap.values());

    return {
      toCreate,
      toUpdate,
      toDelete,
      unchanged
    };
  }

  /**
   * Determines whether two webhook addresses refer to the same location.
   */
  addressesMatch(a: string, b: string): boolean {
    try {
      const urlA = new URL(a);
      const urlB = new URL(b);

      return (
        urlA.origin === urlB.origin &&
        urlA.pathname.replace(/\/+$/, '') === urlB.pathname.replace(/\/+$/, '') &&
        urlA.search === urlB.search
      );
    } catch {
      return a.replace(/\/+$/, '') === b.replace(/\/+$/, '');
    }
  }

  private requiresUpdate(existing: ProviderWebhookRecord, desired: ExpectedWebhookDefinition): boolean {
    if (!this.addressesMatch(existing.address, desired.address)) {
      return true;
    }

    const existingMethod = (existing.fields?.method as string | undefined)?.toUpperCase();
    const desiredMethod = desired.method?.toUpperCase();

    if (desiredMethod && existingMethod && desiredMethod !== existingMethod) {
      return true;
    }

    if (desired.metadata && Object.keys(desired.metadata).length > 0) {
      return true;
    }

    return false;
  }

  private normaliseTopic(topic: string): string {
    return topic.trim().toLowerCase();
  }

  private validateDefinition(definition: ExpectedWebhookDefinition): void {
    if (!definition.topic?.trim()) {
      throw new EcommerceIntegrationError('Webhook topic is required', {
        code: 'INVALID_WEBHOOK_TOPIC',
        severity: 'high'
      });
    }

    if (!definition.address?.trim()) {
      throw new EcommerceIntegrationError('Webhook address is required', {
        code: 'INVALID_WEBHOOK_ADDRESS',
        severity: 'high'
      });
    }
  }
}

export const webhookRegistryService = new WebhookRegistryService();
