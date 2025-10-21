import type { AxiosInstance } from 'axios';
import { integrationDataService } from '../../core/integrationData.service';
import { httpClientFactoryService } from '../../core/httpClientFactory.service';
import { EcommerceIntegrationError } from '../../core/errors';
import type {
  EcommerceProvider,
  ProviderAnalyticsSnapshot,
  ProviderWebhookRecord
} from '../../core/types';

const PROVIDER: EcommerceProvider = 'shopify';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';
const USER_AGENT = process.env.SHOPIFY_USER_AGENT ?? 'Ordira Shopify Integration/2025';

export interface ShopifyOrder {
  id: number;
  name: string;
  email?: string;
  created_at: string;
  updated_at: string;
  currency: string;
  total_price: string;
  subtotal_price?: string;
  total_weight?: number;
  customer?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  line_items: Array<{
    id: number;
    product_id: number | null;
    variant_id: number | null;
    sku?: string;
    title: string;
    quantity: number;
    price: string;
  }>;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  created_at: string;
  updated_at: string;
  variants: Array<{
    id: number;
    sku?: string;
    title: string;
    price: string;
    inventory_quantity?: number;
  }>;
  images: Array<{ id: number; src: string }>;
  tags: string;
}

interface FetchProductsResult {
  products: ShopifyProduct[];
  nextCursor?: string | null;
}

export class ShopifyClientService {
  async getRestClient(businessId: string): Promise<AxiosInstance> {
    const integration = await integrationDataService.getIntegrationRecord(businessId, PROVIDER, {
      includeSecrets: true
    });

    const accessToken = (integration.metadata?.secrets && typeof integration.metadata.secrets === 'object' && 'accessToken' in integration.metadata.secrets) 
      ? integration.metadata.secrets.accessToken as string 
      : undefined;
    if (!integration.connected || !integration.domain || !accessToken) {
      throw new EcommerceIntegrationError('Shopify integration is not connected', {
        provider: PROVIDER,
        businessId,
        code: 'NOT_CONNECTED',
        statusCode: 400,
        severity: 'medium'
      });
    }

    return httpClientFactoryService.createClient({
      provider: PROVIDER,
      businessId,
      baseURL: `https://${integration.domain}`,
      bearerToken: accessToken,
      userAgent: USER_AGENT,
      timeoutMs: 10_000,
      logRequests: false,
      retryOnStatuses: [429, 500, 502, 503, 504]
    });
  }

  async testConnection(businessId: string): Promise<boolean> {
    try {
      const client = await this.getRestClient(businessId);
      await client.get(`/admin/api/${API_VERSION}/shop.json`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fetchOrder(businessId: string, orderId: string | number): Promise<ShopifyOrder> {
    const client = await this.getRestClient(businessId);
    try {
      const response = await client.get<{ order: ShopifyOrder }>(
        `/admin/api/${API_VERSION}/orders/${orderId}.json`,
        {
          params: { status: 'any' }
        }
      );

      if (!response.data?.order) {
        throw new EcommerceIntegrationError('Shopify order response missing payload', {
          provider: PROVIDER,
          businessId,
          code: 'ORDER_MISSING',
          severity: 'medium'
        });
      }

      return response.data.order;
    } catch (error) {
      throw new EcommerceIntegrationError(`Failed to fetch Shopify order ${orderId}`, {
        provider: PROVIDER,
        businessId,
        code: 'ORDER_FETCH_FAILED',
        severity: 'high',
        cause: error as Error
      });
    }
  }

  async listWebhooks(businessId: string): Promise<ProviderWebhookRecord[]> {
    const client = await this.getRestClient(businessId);
    const response = await client.get<{ webhooks: Array<{ id: number; topic: string; address: string; format: string }> }>(
      `/admin/api/${API_VERSION}/webhooks.json`
    );
    return (response.data.webhooks ?? []).map((webhook) => ({
      id: webhook.id,
      topic: webhook.topic,
      address: webhook.address,
      status: 'active'
    }));
  }

  async createWebhook(
    businessId: string,
    webhook: { topic: string; address: string; format?: 'json' | 'xml' }
  ): Promise<ProviderWebhookRecord> {
    const client = await this.getRestClient(businessId);
    const response = await client.post<{ webhook: { id: number; topic: string; address: string } }>(
      `/admin/api/${API_VERSION}/webhooks.json`,
      {
        webhook: {
          topic: webhook.topic,
          address: webhook.address,
          format: webhook.format ?? 'json'
        }
      }
    );
    const created = response.data.webhook;
    return {
      id: created.id,
      topic: created.topic,
      address: created.address,
      status: 'active'
    };
  }

  async updateWebhook(
    businessId: string,
    webhookId: string | number,
    webhook: { topic: string; address: string; format?: 'json' | 'xml' }
  ): Promise<ProviderWebhookRecord> {
    const client = await this.getRestClient(businessId);
    const response = await client.put<{ webhook: { id: number; topic: string; address: string } }>(
      `/admin/api/${API_VERSION}/webhooks/${webhookId}.json`,
      {
        webhook: {
          topic: webhook.topic,
          address: webhook.address,
          format: webhook.format ?? 'json'
        }
      }
    );
    const updated = response.data.webhook;
    return {
      id: updated.id,
      topic: updated.topic,
      address: updated.address,
      status: 'active'
    };
  }

  async deleteWebhook(businessId: string, webhookId: string | number): Promise<void> {
    const client = await this.getRestClient(businessId);
    await client.delete(`/admin/api/${API_VERSION}/webhooks/${webhookId}.json`);
  }

  async fetchProducts(
    businessId: string,
    cursor?: string | null,
    limit = 250
  ): Promise<FetchProductsResult> {
    const client = await this.getRestClient(businessId);
    const response = await client.get<{ products: ShopifyProduct[] }>(
      `/admin/api/${API_VERSION}/products.json`,
      {
        params: {
          limit,
          page_info: cursor ?? undefined
        }
      }
    );

    const nextCursor = this.extractNextCursor(response.headers.link);
    return {
      products: response.data.products ?? [],
      nextCursor
    };
  }

  async getAnalyticsSnapshot(businessId: string): Promise<ProviderAnalyticsSnapshot> {
    const client = await this.getRestClient(businessId);

    const [orderMetrics, productCount] = await Promise.all([
      client.get<{ orders: ShopifyOrder[] }>(
        `/admin/api/${API_VERSION}/orders.json`,
        {
          params: {
            status: 'any',
            limit: 50,
            fields: 'id,total_price,currency,created_at'
          }
        }
      ),
      client.get<{ count: number }>(`/admin/api/${API_VERSION}/products/count.json`)
    ]);

    const orders = orderMetrics.data.orders ?? [];
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0);
    const latestOrder = orders[0]?.created_at ? new Date(orders[0].created_at) : null;
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;

    return {
      totalOrders: orders.length,
      totalRevenue: Number.isFinite(totalRevenue) ? Number(totalRevenue.toFixed(2)) : undefined,
      revenueCurrency: orders[0]?.currency,
      totalProducts: productCount.data.count,
      averageOrderValue: Number.isFinite(averageOrderValue)
        ? Number(averageOrderValue.toFixed(2))
        : undefined,
      lastOrderAt: latestOrder,
      metadata: {
        sampleSize: orders.length
      }
    };
  }

  private extractNextCursor(linkHeader?: string): string | null {
    if (!linkHeader) {
      return null;
    }

    const matches = /<[^>]+page_info=([^&>]+)[^>]*>; rel="next"/.exec(linkHeader);
    return matches ? matches[1] : null;
  }
}

export const shopifyClientService = new ShopifyClientService();
