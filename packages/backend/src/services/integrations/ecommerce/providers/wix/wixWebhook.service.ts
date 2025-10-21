import { wixClientService } from './wixClient.service';
import type {
  ExpectedWebhookDefinition,
  ProviderWebhookAdapter,
  ProviderWebhookRecord
} from '../../core/types';

export class WixWebhookService implements ProviderWebhookAdapter {
  constructor(private readonly client = wixClientService) {}

  async list(businessId: string): Promise<ProviderWebhookRecord[]> {
    return this.client.listWebhooks(businessId);
  }

  async register(
    businessId: string,
    webhook: ExpectedWebhookDefinition
  ): Promise<ProviderWebhookRecord> {
    return this.client.registerWebhook(businessId, {
      eventType: webhook.topic,
      url: webhook.address,
      name: webhook.metadata?.name as string | undefined
    });
  }

  async update(
    businessId: string,
    current: ProviderWebhookRecord,
    desired: ExpectedWebhookDefinition
  ): Promise<ProviderWebhookRecord | void> {
    await this.client.removeWebhook(businessId, current.id);
    return this.register(businessId, desired);
  }

  async remove(businessId: string, webhook: ProviderWebhookRecord): Promise<void> {
    await this.client.removeWebhook(businessId, webhook.id);
  }
}

export const wixWebhookService = new WixWebhookService();
