import crypto from 'crypto';
import type { EcommerceProvider } from '../core/types';

export interface SignatureValidationInput {
  provider: EcommerceProvider;
  payload: string | Buffer;
  signature: string | undefined;
  secret: string | undefined;
  headers?: Record<string, string | string[] | undefined>;
  timestampHeader?: string;
  timestampToleranceMs?: number;
}

const DEFAULT_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies webhook signatures for supported providers.
 */
export function verifyWebhookSignature(input: SignatureValidationInput): boolean {
  const { provider } = input;

  switch (provider) {
    case 'shopify':
      return verifyShopifySignature(input);
    case 'wix':
      return verifyGenericHmacSignature({ ...input, algorithm: 'sha256', encoding: 'hex' });
    case 'woocommerce':
      return verifyGenericHmacSignature({ ...input, algorithm: 'sha256', encoding: 'base64' });
    default:
      return false;
  }
}

interface GenericHmacInput extends SignatureValidationInput {
  algorithm: 'sha1' | 'sha256';
  encoding: 'hex' | 'base64';
}

function verifyGenericHmacSignature(input: GenericHmacInput): boolean {
  const { payload, signature, secret, algorithm, encoding } = input;
  if (!signature || !secret) {
    return false;
  }

  const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const digest = crypto.createHmac(algorithm, secret).update(buffer).digest(encoding);

  return timingSafeCompare(signature, digest);
}

function verifyShopifySignature(input: SignatureValidationInput): boolean {
  const { payload, signature, secret } = input;
  if (!signature || !secret) {
    return false;
  }

  const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  const digest = crypto.createHmac('sha256', secret).update(buffer).digest('base64');

  return timingSafeCompare(signature, digest);
}

export function verifySignedTimestamp({
  timestampHeader,
  timestampToleranceMs = DEFAULT_TIMESTAMP_TOLERANCE_MS
}: Pick<SignatureValidationInput, 'timestampHeader' | 'timestampToleranceMs'>): boolean {
  if (!timestampHeader) {
    return false;
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const age = Math.abs(Date.now() - Number(timestamp) * (timestamp < 1_000_000_000_000 ? 1000 : 1));
  return age <= timestampToleranceMs;
}

function timingSafeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}
