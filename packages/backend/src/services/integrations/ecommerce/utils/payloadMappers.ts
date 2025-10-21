import type {
  OrderCertificatePayload,
  OrderLineItemPayload,
  EcommerceProvider
} from '../core/types';

export interface CanonicalOrderInput {
  provider: EcommerceProvider;
  businessId: string;
  orderId: string;
  customerEmail?: string;
  customerName?: string;
  recipientWallet?: string;
  lineItems: OrderLineItemPayload[];
  metadata?: Record<string, unknown>;
}

export function createOrderPayload(input: CanonicalOrderInput): OrderCertificatePayload {
  const filteredItems = input.lineItems
    .map((item) => ({
      ...item,
      quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? Math.floor(item.quantity) : 1
    }))
    .filter((item) => item.sku || item.productId);

  return {
    provider: input.provider,
    businessId: input.businessId,
    orderId: input.orderId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    recipientWallet: input.recipientWallet,
    lineItems: filteredItems,
    metadata: input.metadata
  };
}

export function deriveCustomerName(firstName?: string | null, lastName?: string | null): string | undefined {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || undefined;
}

export function normaliseSku(value?: string | number | null): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return String(value);
}
