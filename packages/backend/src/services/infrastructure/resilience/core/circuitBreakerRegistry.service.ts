import {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats
} from '../utils/types';

/**
 * Circuit Breaker Service
 *
 * Implements the circuit breaker pattern to handle external service failures
 * gracefully and prevent cascading failures.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private nextAttemptTime?: Date;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN. Next attempt at ${this.nextAttemptTime.toISOString()}`);
      }
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    this.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = undefined;
  }

  getState(): CircuitState {
    return this.state;
  }

  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    }
  }
}

export class CircuitBreakerRegistry {
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  getCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, config));
    }
    return this.circuitBreakers.get(name)!;
  }

  async execute<T>(serviceName: string, operation: () => Promise<T>, config: CircuitBreakerConfig): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, config);
    return circuitBreaker.execute(operation);
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.circuitBreakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  resetAll(): void {
    this.circuitBreakers.forEach(breaker => breaker.reset());
  }

  reset(name: string): void {
    const breaker = this.circuitBreakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }
}

export const CIRCUIT_BREAKER_CONFIGS = {
  DATABASE: {
    failureThreshold: 5,
    timeout: 30000,
    monitoringPeriod: 60000,
    successThreshold: 3
  },
  EXTERNAL_API: {
    failureThreshold: 3,
    timeout: 60000,
    monitoringPeriod: 300000,
    successThreshold: 2
  },
  FILE_STORAGE: {
    failureThreshold: 4,
    timeout: 45000,
    monitoringPeriod: 120000,
    successThreshold: 2
  },
  CACHE: {
    failureThreshold: 10,
    timeout: 15000,
    monitoringPeriod: 30000,
    successThreshold: 5
  }
} as const;

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

export { CircuitState } from '../utils/types';
