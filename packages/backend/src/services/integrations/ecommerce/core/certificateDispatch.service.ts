import { mintingService, type CreateCertInput } from '../../../certificates/features/minting.service';
import { logger } from '../../../../utils/logger';
import { EcommerceIntegrationError } from './errors';
import type {
  CertificateDispatchResult,
  OrderCertificatePayload,
  OrderLineItemPayload
} from './types';

const DEFAULT_METADATA_TEMPLATE = (provider: string, orderId: string, item: OrderLineItemPayload) => ({
  attributes: [
    { trait_type: 'Order ID', value: orderId },
    { trait_type: 'Provider', value: provider },
    ...(item.title ? [{ trait_type: 'Product', value: item.title }] : [])
  ]
});

/**
 * Coordinates certificate creation in response to ecommerce order events.
 */
export class CertificateDispatchService {
  constructor(private readonly certificateService = mintingService) {}

  /**
   * Issue certificates for each qualifying line item.
   */
  async dispatchFromOrder(payload: OrderCertificatePayload): Promise<CertificateDispatchResult> {
    if (!payload.businessId?.trim()) {
      throw new EcommerceIntegrationError('Business identifier is required to dispatch certificates', {
        provider: payload.provider,
        code: 'MISSING_BUSINESS_ID',
        severity: 'high'
      });
    }

    if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
      throw new EcommerceIntegrationError('Order payload contains no line items', {
        provider: payload.provider,
        businessId: payload.businessId,
        code: 'EMPTY_ORDER',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const result: CertificateDispatchResult = {
      orderId: payload.orderId,
      attempted: 0,
      created: 0,
      skipped: 0,
      failures: [],
      metadata: {
        provider: payload.provider,
        businessId: payload.businessId
      }
    };

    for (const item of payload.lineItems) {
      await this.processLineItem(payload, item, result);
    }

    logger.info('Processed ecommerce certificate dispatch', {
      provider: payload.provider,
      businessId: payload.businessId,
      created: result.created,
      skipped: result.skipped,
      attempted: result.attempted,
      failures: result.failures.length
    });

    return result;
  }

  private async processLineItem(
    payload: OrderCertificatePayload,
    item: OrderLineItemPayload,
    result: CertificateDispatchResult
  ): Promise<void> {
    const sku = item.sku?.trim() || String(item.productId ?? '');
    if (!sku) {
      result.skipped++;
      result.failures.push({
        sku: undefined,
        reason: 'Line item missing SKU or product identifier'
      });
      return;
    }

    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? Math.floor(item.quantity) : 1;

    for (let i = 0; i < quantity; i += 1) {
      result.attempted++;

      try {
        const createInput = this.buildCertificateInput(payload, item, sku);
        await this.certificateService.createCertificate(payload.businessId, createInput);
        result.created++;
      } catch (error) {
        logger.error('Failed to create certificate for line item', {
          provider: payload.provider,
          businessId: payload.businessId,
          sku,
          orderId: payload.orderId,
          attempt: i + 1
        }, error as Error);

        result.failures.push({
          sku,
          reason: (error as Error).message
        });
      }
    }
  }

  private buildCertificateInput(
    payload: OrderCertificatePayload,
    item: OrderLineItemPayload,
    sku: string
  ): CreateCertInput {
    const email = payload.customerEmail?.trim();
    const wallet = payload.recipientWallet?.trim();

    if (!email && !wallet) {
      throw new EcommerceIntegrationError('Order is missing recipient contact details', {
        provider: payload.provider,
        businessId: payload.businessId,
        code: 'MISSING_RECIPIENT',
        statusCode: 400,
        severity: 'medium'
      });
    }

    const contactMethod = email ? 'email' : 'wallet';
    const recipient = email ?? wallet!;

    const metadata = {
      ...DEFAULT_METADATA_TEMPLATE(payload.provider, payload.orderId, item),
      ...payload.metadata
    };

    return {
      productId: sku,
      recipient,
      contactMethod,
      metadata
    };
  }
}

export const certificateDispatchService = new CertificateDispatchService();
