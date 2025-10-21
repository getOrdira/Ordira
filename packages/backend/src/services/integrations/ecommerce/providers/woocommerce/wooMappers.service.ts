import {
  wooClientService,
  type WooOrder,
  type WooProduct
} from './wooClient.service';
import { wooWebhookService } from './wooWebhook.service';
import type {
  EcommerceProvider,
  OrderCertificatePayload,
  ProviderAnalyticsAdapter,
  ProviderConnectionAdapter,
  ProviderFeatureAdapters,
  ProviderOrderAdapter,
  ProviderProductAdapter,
  ProductSyncAdapterResult,
  ProductSyncOptions,
  ProviderAnalyticsSnapshot
} from '../../core/types';

const PROVIDER: EcommerceProvider = 'woocommerce';

class WooOrderAdapter implements ProviderOrderAdapter {
  constructor(private readonly client = wooClientService) {}

  async fetchOrder(businessId: string, orderId: string): Promise<OrderCertificatePayload> {
    const order = await this.client.fetchOrder(businessId, orderId);
    return this.mapOrder(order, businessId);
  }

  async transformWebhookPayload(payload: unknown, businessId: string): Promise<OrderCertificatePayload> {
    const order = this.normaliseWebhookPayload(payload);
    return this.mapOrder(order, businessId);
  }

  private normaliseWebhookPayload(payload: unknown): WooOrder {
    if (!payload) {
      throw new Error('WooCommerce webhook payload is empty');
    }

    if (typeof payload === 'string') {
      return this.normaliseWebhookPayload(JSON.parse(payload));
    }

    const record = payload as Record<string, unknown>;
    if (record.order) {
      return record.order as WooOrder;
    }

    if (record.data && (record.data as Record<string, unknown>).order) {
      return (record.data as Record<string, unknown>).order as WooOrder;
    }

    if ((record as unknown as WooOrder).id) {
      return record as unknown as WooOrder as WooOrder;
    }

    throw new Error('WooCommerce webhook payload format is not recognised');
  }

  private mapOrder(order: WooOrder, businessId: string): OrderCertificatePayload {
    const orderId = String(order.id);
    const email = order.billing?.email;
    const customerName = [order.billing?.first_name, order.billing?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const items = (order.line_items ?? []).map((item) => ({
      id: item.id,
      sku: item.sku ?? undefined,
      quantity: item.quantity ?? 1,
      title: item.name,
      metadata: {
        price: item.price,
        total: item.total
      }
    }));

    return {
      provider: PROVIDER,
      businessId,
      orderId,
      customerEmail: email ?? undefined,
      customerName: customerName || undefined,
      lineItems: items,
      metadata: {
        status: order.status,
        total: order.total,
        currency: order.currency,
        wooOrderId: order.id,
        createdAt: order.date_created,
        updatedAt: order.date_modified
      }
    };
  }
}

class WooProductAdapter implements ProviderProductAdapter {
  constructor(private readonly client = wooClientService) {}

  async syncProducts(
    businessId: string,
    options: ProductSyncOptions = {}
  ): Promise<ProductSyncAdapterResult> {
    const cursorPage = options.cursor ? Number.parseInt(String(options.cursor), 10) : NaN;
    const page = Number.isFinite(cursorPage) && cursorPage > 0 ? cursorPage : 1;
    const perPage = options.batchSize && options.batchSize > 0 ? Math.min(options.batchSize, 100) : 100;

    const { products, nextPage } = await this.client.fetchProducts(businessId, page, perPage);

    return {
      synced: products.length,
      skipped: 0,
      metadata: {
        fullSync: options.fullSync ?? false,
        page: nextPage ?? null,
        products: products.map((product) => this.mapProductMetadata(product))
      },
      cursor: nextPage ? String(nextPage) : null,
      errors: []
    };
  }

  private mapProductMetadata(product: WooProduct) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price ?? product.regular_price,
      status: product.status,
      categories: product.categories?.map((category) => category.name),
      stockStatus: product.stock_status,
      stockQuantity: product.stock_quantity,
      lastUpdated: product.date_modified
    };
  }
}

class WooConnectionAdapter implements ProviderConnectionAdapter {
  constructor(private readonly client = wooClientService) {}

  async testConnection(businessId: string): Promise<boolean> {
    return this.client.testConnection(businessId);
  }
}

class WooAnalyticsAdapter implements ProviderAnalyticsAdapter {
  constructor(private readonly client = wooClientService) {}

  async getMetrics(businessId: string): Promise<ProviderAnalyticsSnapshot> {
    return this.client.getAnalyticsSnapshot(businessId);
  }
}

export const wooProviderAdapters: ProviderFeatureAdapters = {
  orders: new WooOrderAdapter(),
  products: new WooProductAdapter(),
  webhooks: wooWebhookService,
  connection: new WooConnectionAdapter(),
  analytics: new WooAnalyticsAdapter()
};

export const wooOrderAdapter = wooProviderAdapters.orders!;
export const wooProductAdapter = wooProviderAdapters.products!;
export const wooConnectionAdapter = wooProviderAdapters.connection!;
export const wooAnalyticsAdapter = wooProviderAdapters.analytics!;
