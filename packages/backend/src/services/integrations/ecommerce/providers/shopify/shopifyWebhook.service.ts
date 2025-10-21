import { shopifyClientService } from './shopifyClient.service';
import type {
  ExpectedWebhookDefinition,
  ProviderWebhookAdapter,
  ProviderWebhookRecord
} from '../../core/types';

export class ShopifyWebhookService implements ProviderWebhookAdapter {
  constructor(private readonly client = shopifyClientService) {}

  async list(businessId: string): Promise<ProviderWebhookRecord[]> {
    return this.client.listWebhooks(businessId);
  }

  async register(
    businessId: string,
    webhook: ExpectedWebhookDefinition
  ): Promise<ProviderWebhookRecord> {
    return this.client.createWebhook(businessId, {
      topic: webhook.topic,
      address: webhook.address,
      format: webhook.format
    });
  }

  async update(
    businessId: string,
    current: ProviderWebhookRecord,
    desired: ExpectedWebhookDefinition
  ): Promise<ProviderWebhookRecord> {
    return this.client.updateWebhook(businessId, current.id, {
      topic: desired.topic,
      address: desired.address,
      format: desired.format
    });
  }

  async remove(businessId: string, webhook: ProviderWebhookRecord): Promise<void> {
    await this.client.deleteWebhook(businessId, webhook.id);
  }
}

export const shopifyWebhookService = new ShopifyWebhookService();
