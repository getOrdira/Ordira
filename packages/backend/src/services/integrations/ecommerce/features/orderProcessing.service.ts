import { certificateDispatchService } from '../core/certificateDispatch.service';
import { EcommerceIntegrationError } from '../core/errors';
import type {
  EcommerceProvider,
  OrderCertificatePayload,
  OrderProcessingOptions,
  OrderProcessingResult,
  ProviderFeatureAdapters,
  ProviderOrderAdapter
} from '../core/types';

const DEFAULT_SOURCE: OrderProcessingOptions['source'] = 'manual';

interface OrderProcessingDependencies {
  adapters?: Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;
}

/**
 * Orchestrates ecommerce order processing and certificate issuance.
 */
export class EcommerceOrderProcessingService {
  private readonly orderAdapters: Partial<Record<EcommerceProvider, ProviderOrderAdapter>>;

  constructor(
    dependencies: OrderProcessingDependencies = {},
    private readonly dispatcher = certificateDispatchService
  ) {
    this.orderAdapters = Object.entries(dependencies.adapters ?? {}).reduce<
      Partial<Record<EcommerceProvider, ProviderOrderAdapter>>
    >((acc, [provider, adapters]) => {
      if (adapters?.orders) {
        acc[provider as EcommerceProvider] = adapters.orders;
      }
      return acc;
    }, {});
  }

  /**
   * Fetches an order via the provider adapter and issues certificates.
   */
  async processOrderById(
    provider: EcommerceProvider,
    businessId: string,
    orderId: string,
    options: OrderProcessingOptions = {}
  ): Promise<OrderProcessingResult> {
    const adapter = this.getOrderAdapter(provider);
    const canonicalOrder = await adapter.fetchOrder(businessId, orderId);
    return this.dispatchCertificates(provider, businessId, canonicalOrder, {
      ...options,
      source: options.source ?? 'manual'
    });
  }

  /**
   * Processes a webhook payload by normalising it via the provider adapter and issuing certificates.
   */
  async processWebhookPayload(
    provider: EcommerceProvider,
    businessId: string,
    payload: unknown,
    options: OrderProcessingOptions = {}
  ): Promise<OrderProcessingResult> {
    const adapter = this.getOrderAdapter(provider);
    if (!adapter.transformWebhookPayload) {
      throw new EcommerceIntegrationError('Provider does not support webhook payload processing', {
        provider,
        businessId,
        code: 'WEBHOOK_UNSUPPORTED',
        statusCode: 501,
        severity: 'medium'
      });
    }

    const canonicalOrder = await adapter.transformWebhookPayload(payload, businessId);
    return this.dispatchCertificates(provider, businessId, canonicalOrder, {
      ...options,
      source: options.source ?? 'webhook'
    });
  }

  private async dispatchCertificates(
    provider: EcommerceProvider,
    businessId: string,
    canonicalOrder: OrderCertificatePayload,
    options: OrderProcessingOptions
  ): Promise<OrderProcessingResult> {
    const source = options.source ?? DEFAULT_SOURCE;

    if (options.skipCertificateCreation) {
      return {
        provider,
        businessId,
        source,
        orderId: canonicalOrder.orderId,
        attempted: 0,
        created: 0,
        skipped: canonicalOrder.lineItems.length,
        failures: [],
        metadata: {
          reason: 'Certificate creation skipped by configuration',
          ...canonicalOrder.metadata,
          ...options.metadata
        }
      };
    }

    const dispatchResult = await this.dispatcher.dispatchFromOrder(canonicalOrder);

    return {
      ...dispatchResult,
      provider,
      businessId,
      source,
      metadata: {
        ...dispatchResult.metadata,
        ...options.metadata
      }
    };
  }

  private getOrderAdapter(provider: EcommerceProvider): ProviderOrderAdapter {
    const adapter = this.orderAdapters[provider];
    if (!adapter) {
      throw new EcommerceIntegrationError('Order adapter not registered for provider', {
        provider,
        code: 'ORDER_ADAPTER_MISSING',
        statusCode: 501,
        severity: 'medium'
      });
    }
    return adapter;
  }
}

export const orderProcessingService = new EcommerceOrderProcessingService();
