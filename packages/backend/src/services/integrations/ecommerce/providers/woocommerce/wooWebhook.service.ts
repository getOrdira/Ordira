import { wooClientService } from './wooClient.service';
import type {
  ExpectedWebhookDefinition,
  ProviderWebhookAdapter,
  ProviderWebhookRecord
} from '../../core/types';

export class WooWebhookService implements ProviderWebhookAdapter {
  constructor(private readonly client = wooClientService) {}

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
      secret: webhook.metadata?.secret as string | undefined
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
      secret: desired.metadata?.secret as string | undefined
    });
  }

  async remove(businessId: string, webhook: ProviderWebhookRecord): Promise<void> {
    await this.client.deleteWebhook(businessId, webhook.id);
  }
}

export const wooWebhookService = new WooWebhookService();
