import Joi from 'joi';
import { CircuitBreakerConfig, CircuitBreakerStats, CircuitState } from '../services/infrastructure/resilience/utils/types';

/**
 * Validation schema for circuit breaker configuration
 */
export const circuitBreakerConfigSchema = Joi.object<CircuitBreakerConfig>({
  failureThreshold: Joi.number().integer().min(1).max(100).required()
    .description('Number of consecutive failures before opening circuit'),
  
  timeout: Joi.number().integer().min(1000).max(300000).required()
    .description('Timeout in milliseconds for circuit breaker operations'),
  
  monitoringPeriod: Joi.number().integer().min(5000).max(3600000).required()
    .description('Period in milliseconds to monitor circuit state'),
  
  successThreshold: Joi.number().integer().min(1).max(50).required()
    .description('Number of consecutive successes to close circuit')
});

/**
 * Validation schema for circuit breaker state
 */
export const circuitStateSchema = Joi.string().valid(
  CircuitState.CLOSED,
  CircuitState.OPEN,
  CircuitState.HALF_OPEN
).required().description('Current state of the circuit breaker');

/**
 * Validation schema for circuit breaker statistics
 */
export const circuitBreakerStatsSchema = Joi.object<CircuitBreakerStats>({
  state: circuitStateSchema,
  
  failureCount: Joi.number().integer().min(0).required()
    .description('Current consecutive failure count'),
  
  successCount: Joi.number().integer().min(0).required()
    .description('Current consecutive success count'),
  
  lastFailureTime: Joi.date().optional()
    .description('Timestamp of last failure'),
  
  lastSuccessTime: Joi.date().optional()
    .description('Timestamp of last success'),
  
  totalRequests: Joi.number().integer().min(0).required()
    .description('Total number of requests processed'),
  
  totalFailures: Joi.number().integer().min(0).required()
    .description('Total number of failures'),
  
  totalSuccesses: Joi.number().integer().min(0).required()
    .description('Total number of successes')
});

/**
 * Validation schema for circuit breaker registration options
 */
export const circuitBreakerRegistrationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
    .description('Unique name for the circuit breaker'),
  
  config: circuitBreakerConfigSchema.required(),
  
  fallbackHandler: Joi.function().optional()
    .description('Optional fallback function when circuit is open'),
  
  onStateChange: Joi.function().optional()
    .description('Optional callback for state change events')
});

/**
 * Validation schema for circuit breaker operation context
 */
export const circuitBreakerOperationSchema = Joi.object({
  operationName: Joi.string().min(1).max(100).optional()
    .description('Name of the operation being executed'),
  
  timeout: Joi.number().integer().min(1000).max(300000).optional()
    .description('Custom timeout for this operation'),
  
  tags: Joi.object().pattern(Joi.string(), Joi.string()).optional()
    .description('Tags for metrics and monitoring')
});

/**
 * Circuit Breaker Validation Service
 */
export class CircuitBreakerValidationService {
  /**
   * Validate circuit breaker configuration
   */
  validateConfig(config: unknown): CircuitBreakerConfig {
    const { error, value } = circuitBreakerConfigSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid circuit breaker configuration: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate circuit breaker statistics
   */
  validateStats(stats: unknown): CircuitBreakerStats {
    const { error, value } = circuitBreakerStatsSchema.validate(stats, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid circuit breaker stats: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate circuit breaker state
   */
  validateState(state: unknown): CircuitState {
    const { error, value } = circuitStateSchema.validate(state, {
      abortEarly: false
    });

    if (error) {
      throw new Error(`Invalid circuit breaker state: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate circuit breaker registration options
   */
  validateRegistration(options: unknown): { name: string; config: CircuitBreakerConfig; fallbackHandler?: Function; onStateChange?: Function } {
    const { error, value } = circuitBreakerRegistrationSchema.validate(options, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid circuit breaker registration: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate circuit breaker operation context
   */
  validateOperation(options: unknown): { operationName?: string; timeout?: number; tags?: Record<string, string> } {
    const { error, value } = circuitBreakerOperationSchema.validate(options, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid circuit breaker operation: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }
}

export const circuitBreakerValidationService = new CircuitBreakerValidationService();
