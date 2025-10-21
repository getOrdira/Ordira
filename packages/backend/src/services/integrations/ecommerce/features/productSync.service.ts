import { integrationDataService } from '../core/integrationData.service';
import { EcommerceIntegrationError } from '../core/errors';
import type {
  EcommerceProvider,
  ProductSyncOptions,
  ProductSyncResult,
  ProviderFeatureAdapters,
  ProviderProductAdapter
} from '../core/types';

interface ProductSyncDependencies {
  adapters?: Partial<Record<EcommerceProvider, ProviderFeatureAdapters>>;
}

/**
 * Coordinates product synchronisation across ecommerce providers.
 */
export class EcommerceProductSyncService {
  private readonly productAdapters: Partial<Record<EcommerceProvider, ProviderProductAdapter>>;

  constructor(dependencies: ProductSyncDependencies = {}) {
    this.productAdapters = Object.entries(dependencies.adapters ?? {}).reduce<
      Partial<Record<EcommerceProvider, ProviderProductAdapter>>
    >((acc, [provider, adapters]) => {
      if (adapters?.products) {
        acc[provider as EcommerceProvider] = adapters.products;
      }
      return acc;
    }, {});
  }

  async syncProducts(
    provider: EcommerceProvider,
    businessId: string,
    options: ProductSyncOptions = {}
  ): Promise<ProductSyncResult> {
    const adapter = this.getProductAdapter(provider);
    const startedAt = Date.now();

    const adapterResult = await adapter.syncProducts(businessId, options);

    const durationMs = Date.now() - startedAt;
    const result: ProductSyncResult = {
      provider,
      businessId,
      synced: adapterResult.synced,
      skipped: adapterResult.skipped ?? 0,
      durationMs,
      errors: adapterResult.errors ?? [],
      metadata: adapterResult.metadata,
      cursor: adapterResult.cursor ?? null
    };

    const shouldRecordSync = options.recordSyncTimestamp ?? true;
    if (shouldRecordSync && adapterResult.synced >= 0) {
      await integrationDataService.recordSuccessfulSync(businessId, provider, {
        syncType: options.fullSync ? 'full' : 'incremental',
        synced: adapterResult.synced,
        skipped: adapterResult.skipped ?? 0,
        durationMs
      });
    }

    return result;
  }

  private getProductAdapter(provider: EcommerceProvider): ProviderProductAdapter {
    const adapter = this.productAdapters[provider];
    if (!adapter) {
      throw new EcommerceIntegrationError('Product adapter not registered for provider', {
        provider,
        code: 'PRODUCT_ADAPTER_MISSING',
        statusCode: 501,
        severity: 'medium'
      });
    }
    return adapter;
  }
}

export const productSyncService = new EcommerceProductSyncService();
