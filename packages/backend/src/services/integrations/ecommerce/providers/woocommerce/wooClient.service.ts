import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { integrationDataService } from '../../core/integrationData.service';
import { httpClientFactoryService } from '../../core/httpClientFactory.service';
import { EcommerceIntegrationError } from '../../core/errors';
import type {
  EcommerceProvider,
  ProviderAnalyticsSnapshot,
  ProviderWebhookRecord
} from '../../core/types';

const PROVIDER: EcommerceProvider = 'woocommerce';

interface WooSystemStatus {
  environment?: {
    version?: string;
  };
  settings?: {
    currency?: string;
    title?: string;
  };
}

export interface WooOrder {
  id: number;
  number?: string;
  status?: string;
  total?: string;
  currency?: string;
  date_created?: string;
  date_modified?: string;
  billing?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    sku?: string;
    quantity: number;
    price: string;
    total: string;
    meta_data?: Array<{ key?: string; value?: string }>;
  }>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku?: string;
  status: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  date_created?: string;
  date_modified?: string;
  stock_status?: string;
  stock_quantity?: number;
  categories?: Array<{ id: number; name: string }>;
}

interface FetchProductsResult {
  products: WooProduct[];
  nextPage: number | null;
}

export class WooCommerceClientService {
  private readonly restPath = '/wp-json/wc/v3';

  async testConnection(businessId: string): Promise<boolean> {
    try {
      await this.execute(businessId, (client) => client.get('/system_status'));
      return true;
    } catch {
      return false;
    }
  }

  async fetchOrder(businessId: string, orderId: string | number): Promise<WooOrder> {
    const response = await this.execute(businessId, (client) =>
      client.get(`/orders/${orderId}`)
    );

    if (!response.data) {
      throw new EcommerceIntegrationError(`WooCommerce order ${orderId} response missing data`, {
        provider: PROVIDER,
        businessId: String(businessId),
        code: 'ORDER_NOT_FOUND',
        statusCode: 404,
        severity: 'medium'
      });
    }

    return response.data as WooOrder;
  }

  async fetchProducts(
    businessId: string,
    page = 1,
    perPage = 100
  ): Promise<FetchProductsResult> {
    const response = await this.execute(businessId, (client) =>
      client.get('/products', {
        params: {
          page,
          per_page: perPage,
          status: 'publish'
        }
      })
    );

    const products: WooProduct[] = response.data ?? [];
    const totalPages = Number(response.headers['x-wp-totalpages'] ?? '0');
    const nextPage = page < totalPages ? page + 1 : null;

    return {
      products,
      nextPage
    };
  }

  async listWebhooks(businessId: string): Promise<ProviderWebhookRecord[]> {
    const response = await this.execute(businessId, (client) => client.get('/webhooks'));
    const webhooks = response.data ?? [];
    return webhooks.map((webhook: any) => ({
      id: webhook.id,
      topic: webhook.topic,
      address: webhook.delivery_url,
      status: webhook.status
    }));
  }

  async createWebhook(
    businessId: string,
    webhook: { topic: string; address: string; secret?: string }
  ): Promise<ProviderWebhookRecord> {
    const response = await this.execute(businessId, (client) =>
      client.post('/webhooks', {
        name: `Ordira ${webhook.topic}`,
        topic: webhook.topic,
        status: 'active',
        delivery_url: webhook.address,
        secret: webhook.secret
      })
    );

    const created = response.data;
    return {
      id: created.id,
      topic: created.topic,
      address: created.delivery_url,
      status: created.status
    };
  }

  async updateWebhook(
    businessId: string,
    webhookId: string | number,
    webhook: { topic: string; address: string; secret?: string }
  ): Promise<ProviderWebhookRecord> {
    const response = await this.execute(businessId, (client) =>
      client.put(`/webhooks/${webhookId}`, {
        topic: webhook.topic,
        delivery_url: webhook.address,
        secret: webhook.secret
      })
    );

    const updated = response.data;
    return {
      id: updated.id,
      topic: updated.topic,
      address: updated.delivery_url,
      status: updated.status
    };
  }

  async deleteWebhook(businessId: string, webhookId: string | number): Promise<void> {
    await this.execute(businessId, (client) => client.delete(`/webhooks/${webhookId}`, { params: { force: true } }));
  }

  async getAnalyticsSnapshot(businessId: string): Promise<ProviderAnalyticsSnapshot> {
    const response = await this.execute(businessId, (client) =>
      client.get('/orders', {
        params: {
          per_page: 50,
          orderby: 'date',
          order: 'desc'
        }
      })
    );

    const orders: WooOrder[] = response.data ?? [];
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total ?? '0'), 0);
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
    const currency = orders[0]?.currency;
    const lastOrderAt = orders[0]?.date_created ? new Date(orders[0].date_created) : null;

    return {
      totalOrders: orders.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueCurrency: currency,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      lastOrderAt,
      metadata: {
        sampleSize: orders.length
      }
    };
  }

  private async execute<T>(
    businessId: string,
    executor: (client: AxiosInstance) => Promise<T>
  ): Promise<T> {
    const client = await this.getRestClient(businessId);
    try {
      return await executor(client);
    } catch (error) {
      throw this.wrapError(error, businessId);
    }
  }

  private async getRestClient(businessId: string): Promise<AxiosInstance> {
    const record = await integrationDataService.getIntegrationRecord(businessId, PROVIDER, {
      includeSecrets: true
    });

    if (!record.connected || !record.domain) {
      throw new EcommerceIntegrationError('WooCommerce integration is not connected', {
        provider: PROVIDER,
        businessId,
        code: 'NOT_CONNECTED',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const consumerKey = (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'accessToken' in record.metadata.secrets) 
      ? record.metadata.secrets.accessToken as string 
      : undefined;
    const consumerSecret = (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'secret' in record.metadata.secrets) 
      ? record.metadata.secrets.secret as string 
      : undefined;

    if (!consumerKey || !consumerSecret) {
      throw new EcommerceIntegrationError('WooCommerce credentials are missing', {
        provider: PROVIDER,
        businessId,
        code: 'MISSING_CREDENTIALS',
        severity: 'high'
      });
    }

    const baseURL = `${record.domain}${this.restPath}`;
    const verifySsl = (record.metadata?.verifySsl as boolean | undefined) ?? true;

    return httpClientFactoryService.createClient({
      provider: PROVIDER,
      businessId,
      baseURL,
      auth: {
        username: consumerKey,
        password: consumerSecret
      },
      userAgent: 'Ordira WooCommerce Integration/2025',
      timeoutMs: 10_000,
      logRequests: false,
      retries: 2,
      retryOnStatuses: [429, 500, 502, 503, 504],
      // WooCommerce self-hosted stores might use self-signed certificates.
      defaultHeaders: verifySsl
        ? undefined
        : {
            'X-WC-Verify-SSL': 'false'
          }
    });
  }

  private wrapError(error: unknown, businessId: string): EcommerceIntegrationError {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status ?? 500;
      const message =
        error.response?.data?.message ??
        error.response?.data?.error ??
        error.message ??
        'WooCommerce API error';

      return new EcommerceIntegrationError(message, {
        provider: PROVIDER,
        businessId,
        statusCode,
        severity: statusCode >= 500 ? 'high' : 'medium',
        details: {
          url: error.config?.url,
          method: error.config?.method,
          status: statusCode,
          response: error.response?.data
        },
        cause: error
      });
    }

    return new EcommerceIntegrationError('Unknown WooCommerce client error', {
      provider: PROVIDER,
      businessId,
      severity: 'high',
      cause: error instanceof Error ? error : undefined
    });
  }
}

export const wooClientService = new WooCommerceClientService();
