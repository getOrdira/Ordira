import axios, { AxiosError, AxiosInstance } from 'axios';
import { integrationDataService } from '../../core/integrationData.service';
import { httpClientFactoryService } from '../../core/httpClientFactory.service';
import { EcommerceIntegrationError } from '../../core/errors';
import { wixAuthService } from './wixAuth.service';
import type {
  EcommerceProvider,
  ProviderAnalyticsSnapshot,
  ProviderWebhookRecord
} from '../../core/types';

const PROVIDER: EcommerceProvider = 'wix';
const API_BASE_URL = 'https://www.wixapis.com';
const USER_AGENT = process.env.WIX_USER_AGENT ?? 'Ordira Wix Integration/2025';

export interface WixPrice {
  amount?: string;
  currency?: string;
}

export interface WixOrderLineItem {
  _id?: string;
  sku?: string;
  quantity?: number;
  productName?: { original?: string };
  catalogReference?: {
    catalogItemId?: string;
    variantId?: string;
  };
  price?: WixPrice;
}

export interface WixOrder {
  _id: string;
  number?: string;
  buyerInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  billingInfo?: {
    email?: string;
  };
  currency?: string;
  priceSummary?: {
    total?: WixPrice;
    subtotal?: WixPrice;
  };
  createdDate?: string;
  updatedDate?: string;
  lineItems?: WixOrderLineItem[];
}

export interface WixProduct {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  price?: WixPrice;
  convertedPrice?: WixPrice;
  lastUpdated?: string;
  sku?: string;
  productType?: string;
  inventory?: {
    inStock?: boolean;
    quantity?: number;
  };
  media?: {
    mainMedia?: {
      image?: {
        url?: string;
      };
    };
  };
  includedVariants?: Array<{
    _id?: string;
    sku?: string;
    price?: WixPrice;
    convertedPrice?: WixPrice;
  }>;
}

interface FetchProductsResponse {
  products: WixProduct[];
  nextCursor: string | null;
}

export class WixClientService {
  constructor(private readonly authService = wixAuthService) {}

  async testConnection(businessId: string): Promise<boolean> {
    try {
      await this.executeWithAutoRefresh(businessId, (client) =>
        client.get('/site-properties/v4/properties')
      );
      return true;
    } catch {
      return false;
    }
  }

  async fetchOrder(businessId: string, orderId: string): Promise<WixOrder> {
    const response = await this.executeWithAutoRefresh(businessId, (client) =>
      client.post('/stores/v1/orders/query', {
        query: {
          filter: {
            $or: [{ _id: orderId }, { id: orderId }, { number: orderId }]
          },
          paging: {
            limit: 1
          }
        }
      })
    );

    const orders: WixOrder[] = response.data?.orders ?? [];
    const order = orders[0];

    if (!order) {
      throw new EcommerceIntegrationError(`Wix order ${orderId} not found`, {
        provider: PROVIDER,
        businessId,
        code: 'ORDER_NOT_FOUND',
        statusCode: 404,
        severity: 'medium'
      });
    }

    return order;
  }

  async fetchProducts(
    businessId: string,
    cursor?: string | null,
    limit = 100
  ): Promise<FetchProductsResponse> {
    const response = await this.executeWithAutoRefresh(businessId, (client) =>
      client.post('/stores/v1/products/query', {
        query: {
          paging: {
            limit,
            ...(cursor ? { cursor } : {})
          }
        }
      })
    );

    const products: WixProduct[] = response.data?.products ?? [];
    const paging = response.data?.paging ?? {};

    const nextCursor =
      paging?.cursorPaging?.nextPage?.cursor ??
      paging?.cursorPaging?.next?.cursor ??
      paging?.cursor ?? null;

    return {
      products,
      nextCursor: nextCursor ?? null
    };
  }

  async listWebhooks(businessId: string): Promise<ProviderWebhookRecord[]> {
    const response = await this.executeWithAutoRefresh(businessId, (client) =>
      client.get('/webhooks/v1/webhooks')
    );

    return (response.data?.webhooks ?? []).map((webhook: any) => ({
      id: webhook.id,
      topic: webhook.eventType,
      address: webhook.url,
      status: webhook.isActive === false ? 'inactive' : 'active'
    }));
  }

  async registerWebhook(
    businessId: string,
    definition: { eventType: string; url: string; name?: string }
  ): Promise<ProviderWebhookRecord> {
    const response = await this.executeWithAutoRefresh(businessId, (client) =>
      client.post('/webhooks/v1/webhooks', {
        name: definition.name ?? `Ordira ${definition.eventType}`,
        eventType: definition.eventType,
        entityId: '*',
        url: definition.url
      })
    );

    const webhook = response.data?.webhook;
    return {
      id: webhook?.id ?? 'unknown',
      topic: webhook?.eventType ?? definition.eventType,
      address: webhook?.url ?? definition.url,
      status: webhook?.isActive === false ? 'inactive' : 'active'
    };
  }

  async removeWebhook(businessId: string, webhookId: string | number): Promise<void> {
    await this.executeWithAutoRefresh(businessId, (client) =>
      client.delete(`/webhooks/v1/webhooks/${webhookId}`)
    );
  }

  async getAnalyticsSnapshot(businessId: string): Promise<ProviderAnalyticsSnapshot> {
    const response = await this.executeWithAutoRefresh(businessId, (client) =>
      client.post('/stores/v1/orders/query', {
        query: {
          paging: {
            limit: 50
          },
          sort: [
            {
              fieldName: 'createdDate',
              order: 'DESC'
            }
          ]
        }
      })
    );

    const orders: WixOrder[] = response.data?.orders ?? [];
    let totalRevenue = 0;
    let currency: string | undefined;

    for (const order of orders) {
      const amount = order.priceSummary?.total?.amount;
      if (amount) {
        totalRevenue += Number.parseFloat(amount);
      }
      if (!currency && order.priceSummary?.total?.currency) {
        currency = order.priceSummary.total.currency;
      }
    }

    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
    const lastOrderAt = orders[0]?.createdDate ? new Date(orders[0].createdDate) : null;

    return {
      totalOrders: orders.length,
      totalRevenue: Number.isFinite(totalRevenue) ? Number(totalRevenue.toFixed(2)) : undefined,
      revenueCurrency: currency,
      averageOrderValue: Number.isFinite(averageOrderValue)
        ? Number(averageOrderValue.toFixed(2))
        : undefined,
      lastOrderAt,
      metadata: {
        sampleSize: orders.length
      }
    };
  }

  private async executeWithAutoRefresh<T>(
    businessId: string,
    executor: (client: AxiosInstance) => Promise<T>
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < 2) {
      const client = await this.getRestClient(businessId);
      try {
        return await executor(client);
      } catch (error) {
        if (this.isUnauthorized(error) && attempt === 0) {
          await this.authService.refreshAccessToken(businessId);
          attempt += 1;
          continue;
        }
        lastError = error;
        break;
      }
    }

    throw this.toIntegrationError(lastError, businessId);
  }

  private async getRestClient(businessId: string): Promise<AxiosInstance> {
    const record = await integrationDataService.getIntegrationRecord(businessId, PROVIDER, {
      includeSecrets: true
    });

    const accessToken = (record.metadata?.secrets && typeof record.metadata.secrets === 'object' && 'accessToken' in record.metadata.secrets) 
      ? record.metadata.secrets.accessToken as string 
      : undefined;
    if (!accessToken) {
      throw new EcommerceIntegrationError('Wix integration is missing an access token', {
        provider: PROVIDER,
        businessId,
        code: 'ACCESS_TOKEN_MISSING',
        severity: 'high'
      });
    }

    return httpClientFactoryService.createClient({
      provider: PROVIDER,
      businessId,
      baseURL: API_BASE_URL,
      bearerToken: accessToken,
      userAgent: USER_AGENT,
      timeoutMs: 10_000,
      logRequests: false,
      retryOnStatuses: [429, 500, 502, 503, 504]
    });
  }

  private isUnauthorized(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 401;
  }

  private toIntegrationError(error: unknown, businessId: string): EcommerceIntegrationError {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status ?? 500;
      const message = error.response?.data?.error?.message ?? error.message ?? 'Wix API error';

      return new EcommerceIntegrationError(message, {
        provider: PROVIDER,
        businessId,
        statusCode,
        severity: statusCode >= 500 ? 'high' : 'medium',
        details: {
          status: statusCode,
          url: error.config?.url,
          method: error.config?.method,
          response: error.response?.data
        },
        cause: error
      });
    }

    return new EcommerceIntegrationError('Unknown Wix client error', {
      provider: PROVIDER,
      businessId,
      cause: error instanceof Error ? error : undefined,
      severity: 'high'
    });
  }
}

export const wixClientService = new WixClientService();
