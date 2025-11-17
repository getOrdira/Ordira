/**
 * Webhook Payload Validation
 * 
 * Validates webhook payload structure and content for different ecommerce providers
 * before processing to ensure data integrity and prevent errors.
 */

import { EcommerceIntegrationError } from '../core/errors';
import type { EcommerceProvider } from '../core/types';

export interface WebhookValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  normalizedPayload?: unknown;
}

/**
 * Validates webhook payload structure for a specific provider
 */
export function validateWebhookPayload(
  provider: EcommerceProvider,
  payload: unknown,
  topic?: string
): WebhookValidationResult {
  if (!payload) {
    return {
      valid: false,
      errors: ['Webhook payload is required']
    };
  }

  switch (provider) {
    case 'shopify':
      return validateShopifyWebhookPayload(payload, topic);
    case 'wix':
      return validateWixWebhookPayload(payload, topic);
    case 'woocommerce':
      return validateWooCommerceWebhookPayload(payload, topic);
    default:
      return {
        valid: false,
        errors: [`Unsupported provider: ${provider}`]
      };
  }
}

/**
 * Validates Shopify webhook payload structure
 */
function validateShopifyWebhookPayload(
  payload: unknown,
  topic?: string
): WebhookValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Shopify webhooks can be:
  // - { order: {...} } for order webhooks
  // - { customer: {...} } for customer webhooks
  // - { product: {...} } for product webhooks
  // - Direct object for some webhook types

  if (typeof payload !== 'object' || payload === null) {
    errors.push('Shopify webhook payload must be an object');
    return { valid: false, errors };
  }

  const payloadObj = payload as Record<string, unknown>;

  // Check for common Shopify webhook structures
  if (topic?.includes('order')) {
    if (!payloadObj.order && !payloadObj.id) {
      errors.push('Shopify order webhook missing order data');
    } else if (payloadObj.order) {
      const order = payloadObj.order as Record<string, unknown>;
      if (!order.id && !order.name) {
        errors.push('Shopify order missing required identifier (id or name)');
      }
    }
  }

  if (topic?.includes('customer')) {
    if (!payloadObj.customer && !payloadObj.id) {
      errors.push('Shopify customer webhook missing customer data');
    } else if (payloadObj.customer) {
      const customer = payloadObj.customer as Record<string, unknown>;
      if (!customer.id && !customer.email) {
        errors.push('Shopify customer missing required identifier (id or email)');
      }
    }
  }

  if (topic?.includes('product')) {
    if (!payloadObj.product && !payloadObj.id) {
      errors.push('Shopify product webhook missing product data');
    }
  }

  // Check for timestamp (common in Shopify webhooks)
  if (!payloadObj.created_at && !payloadObj.updated_at) {
    warnings.push('Shopify webhook payload missing timestamp fields');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
    normalizedPayload: payload
  };
}

/**
 * Validates Wix webhook payload structure
 */
function validateWixWebhookPayload(
  payload: unknown,
  topic?: string
): WebhookValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    errors.push('Wix webhook payload must be an object');
    return { valid: false, errors };
  }

  const payloadObj = payload as Record<string, unknown>;

  // Wix webhooks typically have:
  // - data: { ... } - the actual event data
  // - eventType: string - the event type
  // - instanceId: string - the Wix instance ID

  if (!payloadObj.data && !payloadObj._id && !payloadObj.id) {
    errors.push('Wix webhook payload missing data or identifier');
  }

  // Check for event type
  if (!payloadObj.eventType && !topic) {
    warnings.push('Wix webhook payload missing event type');
  }

  // Validate data structure if present
  if (payloadObj.data) {
    const data = payloadObj.data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null) {
      errors.push('Wix webhook data must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
    normalizedPayload: payload
  };
}

/**
 * Validates WooCommerce webhook payload structure
 */
function validateWooCommerceWebhookPayload(
  payload: unknown,
  topic?: string
): WebhookValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    errors.push('WooCommerce webhook payload must be an object');
    return { valid: false, errors };
  }

  const payloadObj = payload as Record<string, unknown>;

  // WooCommerce webhooks typically have:
  // - id: number - the resource ID
  // - status: string - the resource status
  // - date_created: string - creation timestamp
  // - line_items: array - for orders

  if (!payloadObj.id && typeof payloadObj.id !== 'number') {
    errors.push('WooCommerce webhook payload missing required id field');
  }

  // Validate order structure if it's an order webhook
  if (topic?.includes('order') || payloadObj.line_items) {
    if (!Array.isArray(payloadObj.line_items) && !payloadObj.line_items) {
      warnings.push('WooCommerce order webhook missing line_items array');
    }

    if (!payloadObj.billing && !payloadObj.customer_email) {
      warnings.push('WooCommerce order webhook missing billing or customer email');
    }
  }

  // Check for timestamp
  if (!payloadObj.date_created && !payloadObj.date_modified) {
    warnings.push('WooCommerce webhook payload missing timestamp fields');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
    normalizedPayload: payload
  };
}

/**
 * Validates webhook payload and throws if invalid
 */
export function assertWebhookPayload(
  provider: EcommerceProvider,
  payload: unknown,
  topic?: string
): void {
  const validation = validateWebhookPayload(provider, payload, topic);
  
  if (!validation.valid) {
    throw new EcommerceIntegrationError(
      `Invalid webhook payload for ${provider}: ${validation.errors.join(', ')}`,
      {
        provider,
        code: 'INVALID_WEBHOOK_PAYLOAD',
        statusCode: 400,
        severity: 'medium',
        details: {
          errors: validation.errors,
          warnings: validation.warnings,
          topic
        }
      }
    );
  }
}
