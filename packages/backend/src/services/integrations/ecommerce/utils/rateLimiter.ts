import { logger } from '../../../../utils/logger';

export interface RateLimiterOptions {
  tokensPerInterval: number;
  intervalMs: number;
  maxBurst?: number;
  minDelayMs?: number;
  jitterMs?: number;
  onRateLimit?: (info: { remaining: number; resetAt: Date }) => void;
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly options: RateLimiterOptions) {
    this.tokens = options.maxBurst ?? options.tokensPerInterval;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        const delay = this.computeDelay();
        if (delay > 0) {
          await sleep(delay);
        }
        return;
      }

      const wait = this.computeWaitTime();
      const resetAt = new Date(Date.now() + wait);
      this.options.onRateLimit?.({ remaining: 0, resetAt });
      await sleep(wait);
    }
  }

  private refill(): void {
    const { tokensPerInterval, intervalMs, maxBurst } = this.options;
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed <= 0) {
      return;
    }

    const tokensToAdd = (elapsed / intervalMs) * tokensPerInterval;
    if (tokensToAdd <= 0) {
      return;
    }

    this.tokens = Math.min((maxBurst ?? tokensPerInterval), this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private computeDelay(): number {
    const minDelay = this.options.minDelayMs ?? 0;
    const jitter = this.options.jitterMs ?? 0;
    if (minDelay === 0 && jitter === 0) {
      return 0;
    }

    const randomJitter = jitter > 0 ? Math.random() * jitter : 0;
    return minDelay + randomJitter;
  }

  private computeWaitTime(): number {
    const { tokensPerInterval, intervalMs } = this.options;
    const tokensNeeded = 1 - this.tokens;
    const timePerToken = intervalMs / tokensPerInterval;
    return Math.ceil(tokensNeeded * timePerToken);
  }
}

export interface BackoffOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
}

export async function exponentialBackoff(attempt: number, options: BackoffOptions = {}): Promise<void> {
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 10_000;
  const jitter = options.jitterMs ?? 250;

  const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  const randomJitter = jitter > 0 ? Math.random() * jitter : 0;
  await sleep(delay + randomJitter);
}

export function logRateLimitHit(provider: EcommerceProvider, context: Record<string, unknown> = {}): void {
  logger.warn('Ecommerce provider rate limit encountered', {
    provider,
    ...context
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { EcommerceProvider } from '../core/types';
