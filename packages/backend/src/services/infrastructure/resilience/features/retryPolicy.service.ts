import { logger } from '../../../../utils/logger';
import type { RetryPolicyOptions, RetryState } from '../utils/types';

const DEFAULT_OPTIONS: Required<Pick<RetryPolicyOptions, 'maxAttempts' | 'baseDelayMs' | 'maxDelayMs' | 'jitter'>> = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  jitter: true
};

export class RetryPolicyService {
  async execute<T>(operation: () => Promise<T>, options: RetryPolicyOptions = {}): Promise<T> {
    const config = {
      maxAttempts: options.maxAttempts ?? DEFAULT_OPTIONS.maxAttempts,
      baseDelayMs: options.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs,
      maxDelayMs: options.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs,
      jitter: options.jitter ?? DEFAULT_OPTIONS.jitter
    } as const;

    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === config.maxAttempts) {
          throw error;
        }

        const retryState: RetryState = {
          attempt,
          maxAttempts: config.maxAttempts,
          delayMs: this.calculateDelay(config.baseDelayMs, attempt, config.maxDelayMs, config.jitter),
          lastError: error
        };

        logger.warn('Retryable operation failed, scheduling retry', {
          attempt: retryState.attempt,
          maxAttempts: retryState.maxAttempts,
          delayMs: retryState.delayMs,
          message: error instanceof Error ? error.message : 'Unknown error'
        });

        await this.delay(retryState.delayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Retry operation failed');
  }

  private calculateDelay(baseDelay: number, attempt: number, maxDelay: number, jitter: boolean): number {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    if (!jitter) {
      return exponentialDelay;
    }

    const jitterValue = Math.random() * baseDelay;
    return Math.min(exponentialDelay + jitterValue, maxDelay);
  }

  private async delay(durationMs: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, durationMs));
  }
}

export const retryPolicyService = new RetryPolicyService();
