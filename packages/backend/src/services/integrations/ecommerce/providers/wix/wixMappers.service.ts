import {
  wixClientService,
  type WixOrder,
  type WixProduct,
  type WixOrderLineItem
} from './wixClient.service';
import { wixWebhookService } from './wixWebhook.service';
import type {
  EcommerceProvider,
  OrderCertificatePayload,
  ProviderFeatureAdapters,
  ProviderOrderAdapter,
  ProviderProductAdapter,
  ProviderConnectionAdapter,
  ProviderAnalyticsAdapter,
  ProductSyncAdapterResult,
  ProductSyncOptions,
  ProviderAnalyticsSnapshot
} from '../../core/types';

const PROVIDER: EcommerceProvider = 'wix';

class WixOrderAdapter implements ProviderOrderAdapter {
  constructor(private readonly client = wixClientService) {}

  async fetchOrder(businessId: string, orderId: string): Promise<OrderCertificatePayload> {
    const order = await this.client.fetchOrder(businessId, orderId);
    return this.mapOrder(order, businessId);
  }

  async transformWebhookPayload(payload: unknown, businessId: string): Promise<OrderCertificatePayload> {
    const order = this.normaliseWebhookPayload(payload);
    return this.mapOrder(order, businessId);
  }

  private normaliseWebhookPayload(payload: unknown): WixOrder {
    if (!payload) {
      throw new Error('Wix webhook payload is empty');
    }

    if (typeof payload === 'string') {
      return this.normaliseWebhookPayload(JSON.parse(payload));
    }

    const record = payload as Record<string, unknown>;

    if (record.order) {
      return record.order as WixOrder;
    }

    if (record.data && (record.data as Record<string, unknown>).order) {
      return (record.data as Record<string, unknown>).order as WixOrder;
    }

    if (record.entity) {
      return record.entity as WixOrder;
    }

    if ((record as unknown as WixOrder)._id) {
      return record as unknown as WixOrder as WixOrder;
    }

    throw new Error('Unable to parse Wix webhook payload');
  }

  private mapOrder(order: WixOrder, businessId: string): OrderCertificatePayload {
    const orderId = order._id ?? order.number ?? '';
    if (!orderId) {
      throw new Error('Order payload missing identifier');
    }

    const email = order.buyerInfo?.email ?? order.billingInfo?.email;
    const fullName = [order.buyerInfo?.firstName, order.buyerInfo?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const lineItems = (order.lineItems ?? []).map((item) => this.mapLineItem(item)).filter(Boolean);

    return {
      provider: PROVIDER,
      businessId,
      orderId,
      customerEmail: email ?? undefined,
      customerName: fullName || undefined,
      lineItems,
      metadata: {
        currency: order.priceSummary?.total?.currency,
        totalAmount: order.priceSummary?.total?.amount,
        createdAt: order.createdDate,
        updatedAt: order.updatedDate
      }
    };
  }

  private mapLineItem(item: WixOrderLineItem): { sku?: string; quantity: number; title?: string; metadata?: Record<string, unknown> } | null {
    const sku =
      item.sku ??
      item.catalogReference?.variantId ??
      item.catalogReference?.catalogItemId ??
      undefined;

    const quantity = Number.isFinite(item.quantity) && item.quantity ? item.quantity : 1;

    if (!sku) {
      return null;
    }

    return {
      sku,
      quantity,
      title: item.productName?.original ?? undefined,
      metadata: {
        price: item.price?.amount,
        currency: item.price?.currency
      }
    };
  }
}

class WixProductAdapter implements ProviderProductAdapter {
  constructor(private readonly client = wixClientService) {}

  async syncProducts(
    businessId: string,
    options: ProductSyncOptions = {}
  ): Promise<ProductSyncAdapterResult> {
    const limit = options.batchSize && options.batchSize > 0 ? Math.min(options.batchSize, 100) : 100;
    const { products, nextCursor } = await this.client.fetchProducts(businessId, options.cursor, limit);

    return {
      synced: products.length,
      skipped: 0,
      metadata: {
        fullSync: options.fullSync ?? false,
        products: products.map((product) => this.mapProductMetadata(product))
      },
      cursor: nextCursor,
      errors: []
    };
  }

  private mapProductMetadata(product: WixProduct) {
    return {
      id: product._id,
      name: product.name,
      sku: product.sku,
      price: product.price?.amount ?? product.convertedPrice?.amount,
      currency: product.price?.currency ?? product.convertedPrice?.currency,
      lastUpdated: product.lastUpdated,
      variants: product.includedVariants?.map((variant) => ({
        id: variant._id,
        sku: variant.sku,
        price: variant.price?.amount ?? variant.convertedPrice?.amount
      }))
    };
  }
}

class WixConnectionAdapter implements ProviderConnectionAdapter {
  constructor(private readonly client = wixClientService) {}

  async testConnection(businessId: string): Promise<boolean> {
    return this.client.testConnection(businessId);
  }
}

class WixAnalyticsAdapter implements ProviderAnalyticsAdapter {
  constructor(private readonly client = wixClientService) {}

  async getMetrics(businessId: string): Promise<ProviderAnalyticsSnapshot> {
    return this.client.getAnalyticsSnapshot(businessId);
  }
}

export const wixProviderAdapters: ProviderFeatureAdapters = {
  orders: new WixOrderAdapter(),
  products: new WixProductAdapter(),
  webhooks: wixWebhookService,
  connection: new WixConnectionAdapter(),
  analytics: new WixAnalyticsAdapter()
};

export const wixOrderAdapter = wixProviderAdapters.orders!;
export const wixProductAdapter = wixProviderAdapters.products!;
export const wixConnectionAdapter = wixProviderAdapters.connection!;
export const wixAnalyticsAdapter = wixProviderAdapters.analytics!;
