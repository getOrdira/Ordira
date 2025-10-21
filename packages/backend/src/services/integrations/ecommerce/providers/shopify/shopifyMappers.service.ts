import {
  shopifyClientService,
  type ShopifyOrder,
  type ShopifyProduct
} from './shopifyClient.service';
import { shopifyWebhookService } from './shopifyWebhook.service';
import type {
  EcommerceProvider,
  OrderCertificatePayload,
  ProviderAnalyticsAdapter,
  ProviderFeatureAdapters,
  ProviderOrderAdapter,
  ProviderProductAdapter,
  ProviderConnectionAdapter,
  ProviderAnalyticsSnapshot,
  ProductSyncAdapterResult,
  ProductSyncOptions,
  OrderProcessingResult
} from '../../core/types';

const PROVIDER: EcommerceProvider = 'shopify';

class ShopifyOrderAdapter implements ProviderOrderAdapter {
  constructor(private readonly client = shopifyClientService) {}

  async fetchOrder(businessId: string, orderId: string): Promise<OrderCertificatePayload> {
    const order = await this.client.fetchOrder(businessId, orderId);
    return this.mapOrder(order, businessId);
  }

  async transformWebhookPayload(payload: unknown, businessId: string): Promise<OrderCertificatePayload> {
    const order = this.normaliseWebhookPayload(payload);
    return this.mapOrder(order, businessId);
  }

  private normaliseWebhookPayload(payload: unknown): ShopifyOrder {
    if (!payload) {
      throw new Error('Shopify webhook payload is empty');
    }

    if (typeof payload === 'string') {
      return JSON.parse(payload) as ShopifyOrder;
    }

    if ((payload as { id?: number }).id) {
      return payload as ShopifyOrder;
    }

    if ((payload as { order?: ShopifyOrder }).order) {
      return (payload as { order: ShopifyOrder }).order;
    }

    throw new Error('Shopify webhook payload could not be parsed');
  }

  private mapOrder(order: ShopifyOrder, businessId: string): OrderCertificatePayload {
    const customerName = [order.customer?.first_name, order.customer?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      provider: PROVIDER,
      businessId,
      orderId: String(order.id),
      customerEmail: order.email ?? order.customer?.email,
      customerName: customerName || undefined,
      lineItems: (order.line_items ?? []).map((item) => ({
        id: item.id,
        productId: item.product_id ?? undefined,
        sku: item.sku ?? (item.variant_id ? String(item.variant_id) : undefined),
        quantity: item.quantity,
        title: item.title,
        metadata: {
          variantId: item.variant_id,
          price: item.price
        }
      })),
      metadata: {
        name: order.name,
        currency: order.currency,
        shopifyOrderId: order.id,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    };
  }
}

class ShopifyProductAdapter implements ProviderProductAdapter {
  constructor(private readonly client = shopifyClientService) {}

  async syncProducts(
    businessId: string,
    options: ProductSyncOptions = {}
  ): Promise<ProductSyncAdapterResult> {
    const pageLimit = options.batchSize && options.batchSize > 0 ? Math.min(options.batchSize, 250) : 250;
    const { products, nextCursor } = await this.client.fetchProducts(businessId, options.cursor, pageLimit);

    return {
      synced: products.length,
      skipped: 0,
      metadata: {
        products: products.map((product) => this.mapProductForMetadata(product)),
        fullSync: options.fullSync ?? false
      },
      cursor: nextCursor ?? null
    };
  }

  private mapProductForMetadata(product: ShopifyProduct) {
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      variants: product.variants?.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        title: variant.title
      }))
    };
  }
}

class ShopifyConnectionAdapter implements ProviderConnectionAdapter {
  constructor(private readonly client = shopifyClientService) {}

  async testConnection(businessId: string): Promise<boolean> {
    return this.client.testConnection(businessId);
  }
}

class ShopifyAnalyticsAdapter implements ProviderAnalyticsAdapter {
  constructor(private readonly client = shopifyClientService) {}

  async getMetrics(businessId: string): Promise<ProviderAnalyticsSnapshot> {
    return this.client.getAnalyticsSnapshot(businessId);
  }
}

export const shopifyProviderAdapters: ProviderFeatureAdapters = {
  orders: new ShopifyOrderAdapter(),
  products: new ShopifyProductAdapter(),
  webhooks: shopifyWebhookService,
  connection: new ShopifyConnectionAdapter(),
  analytics: new ShopifyAnalyticsAdapter()
};

export const shopifyOrderAdapter = shopifyProviderAdapters.orders!;
export const shopifyProductAdapter = shopifyProviderAdapters.products!;
export const shopifyConnectionAdapter = shopifyProviderAdapters.connection!;
export const shopifyAnalyticsAdapter = shopifyProviderAdapters.analytics!;
