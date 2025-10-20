import Joi from 'joi';
import { RetryPolicyOptions, RetryState } from '../services/infrastructure/resilience/utils/types';

/**
 * Validation schema for retry policy options
 */
export const retryPolicyOptionsSchema = Joi.object<RetryPolicyOptions>({
  maxAttempts: Joi.number().integer().min(1).max(20).optional()
    .description('Maximum number of retry attempts'),
  
  baseDelayMs: Joi.number().integer().min(100).max(60000).optional()
    .description('Base delay in milliseconds between retries'),
  
  maxDelayMs: Joi.number().integer().min(1000).max(300000).optional()
    .description('Maximum delay in milliseconds between retries'),
  
  jitter: Joi.boolean().optional()
    .description('Whether to add jitter to delay calculations')
});

/**
 * Validation schema for retry state
 */
export const retryStateSchema = Joi.object<RetryState>({
  attempt: Joi.number().integer().min(1).max(20).required()
    .description('Current attempt number'),
  
  maxAttempts: Joi.number().integer().min(1).max(20).required()
    .description('Maximum number of attempts'),
  
  delayMs: Joi.number().integer().min(0).max(300000).required()
    .description('Delay in milliseconds for next retry'),
  
  lastError: Joi.any().optional()
    .description('Last error that occurred')
});

/**
 * Validation schema for retry operation context
 */
export const retryOperationContextSchema = Joi.object({
  operationName: Joi.string().min(1).max(100).optional()
    .description('Name of the operation being retried'),
  
  tags: Joi.object().pattern(Joi.string(), Joi.string()).optional()
    .description('Tags for metrics and monitoring'),
  
  shouldRetry: Joi.function().optional()
    .description('Custom function to determine if error should be retried'),
  
  onRetry: Joi.function().optional()
    .description('Callback function called before each retry'),
  
  onFailure: Joi.function().optional()
    .description('Callback function called when all retries are exhausted')
});

/**
 * Validation schema for retry policy configuration
 */
export const retryPolicyConfigSchema = Joi.object({
  defaultOptions: retryPolicyOptionsSchema.optional()
    .description('Default retry options'),
  
  operationSpecificOptions: Joi.object().pattern(
    Joi.string(),
    retryPolicyOptionsSchema
  ).optional().description('Operation-specific retry options'),
  
  globalMaxAttempts: Joi.number().integer().min(1).max(20).optional()
    .description('Global maximum attempts limit'),
  
  globalMaxDelayMs: Joi.number().integer().min(1000).max(300000).optional()
    .description('Global maximum delay limit')
});

/**
 * Validation schema for retry metrics
 */
export const retryMetricsSchema = Joi.object({
  operationName: Joi.string().min(1).max(100).required()
    .description('Name of the operation'),
  
  totalAttempts: Joi.number().integer().min(1).required()
    .description('Total number of attempts made'),
  
  totalDuration: Joi.number().integer().min(0).required()
    .description('Total duration of all attempts in milliseconds'),
  
  successOnAttempt: Joi.number().integer().min(1).optional()
    .description('Attempt number on which operation succeeded'),
  
  lastError: Joi.string().max(1000).optional()
    .description('Last error message'),
  
  tags: Joi.object().pattern(Joi.string(), Joi.string()).optional()
    .description('Operation tags')
});

/**
 * Retry Policy Validation Service
 */
export class RetryPolicyValidationService {
  /**
   * Validate retry policy options
   */
  validateOptions(options: unknown): RetryPolicyOptions {
    const { error, value } = retryPolicyOptionsSchema.validate(options, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid retry policy options: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate retry state
   */
  validateState(state: unknown): RetryState {
    const { error, value } = retryStateSchema.validate(state, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid retry state: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate retry operation context
   */
  validateOperationContext(context: unknown): { 
    operationName?: string; 
    tags?: Record<string, string>; 
    shouldRetry?: Function; 
    onRetry?: Function; 
    onFailure?: Function 
  } {
    const { error, value } = retryOperationContextSchema.validate(context, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid retry operation context: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate retry policy configuration
   */
  validateConfig(config: unknown): { 
    defaultOptions?: RetryPolicyOptions; 
    operationSpecificOptions?: Record<string, RetryPolicyOptions>; 
    globalMaxAttempts?: number; 
    globalMaxDelayMs?: number 
  } {
    const { error, value } = retryPolicyConfigSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid retry policy configuration: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate retry metrics
   */
  validateMetrics(metrics: unknown): { 
    operationName: string; 
    totalAttempts: number; 
    totalDuration: number; 
    successOnAttempt?: number; 
    lastError?: string; 
    tags?: Record<string, string> 
  } {
    const { error, value } = retryMetricsSchema.validate(metrics, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new Error(`Invalid retry metrics: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  /**
   * Validate that retry options are logically consistent
   */
  validateOptionsConsistency(options: RetryPolicyOptions): void {
    if (options.baseDelayMs && options.maxDelayMs && options.baseDelayMs > options.maxDelayMs) {
      throw new Error('baseDelayMs cannot be greater than maxDelayMs');
    }

    if (options.maxAttempts && options.maxAttempts < 1) {
      throw new Error('maxAttempts must be at least 1');
    }

    if (options.baseDelayMs && options.baseDelayMs < 100) {
      throw new Error('baseDelayMs must be at least 100ms');
    }

    if (options.maxDelayMs && options.maxDelayMs > 300000) {
      throw new Error('maxDelayMs cannot exceed 300 seconds');
    }
  }

  /**
   * Validate retry state consistency
   */
  validateStateConsistency(state: RetryState): void {
    if (state.attempt > state.maxAttempts) {
      throw new Error('Current attempt cannot exceed maximum attempts');
    }

    if (state.attempt < 1) {
      throw new Error('Attempt number must be at least 1');
    }

    if (state.delayMs < 0) {
      throw new Error('Delay cannot be negative');
    }

    if (state.delayMs > 300000) {
      throw new Error('Delay cannot exceed 300 seconds');
    }
  }
}

export const retryPolicyValidationService = new RetryPolicyValidationService();
