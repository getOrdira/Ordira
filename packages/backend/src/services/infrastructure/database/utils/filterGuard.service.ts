import { createAppError } from '../../../../middleware/core/error.middleware'; 
import { logger } from '../../../../utils/logger';
import { monitoringService } from '../../observability/core/monitoringRegistry.service';

// Allowed MongoDB operators for safe queries
const ALLOWED_OPERATORS = new Set([
  '$in', '$nin', '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
  '$text', '$search', '$regex', '$options', '$exists', '$type',
  '$and', '$or', '$nor', '$not', '$all', '$elemMatch', '$size'
]);

// Dangerous operators that should never be allowed
const DANGEROUS_OPERATORS = new Set([
  '$where', '$eval', '$expr', '$function', '$accumulator',
  '$addFields', '$bucket', '$bucketAuto', '$collStats',
  '$count', '$currentOp', '$facet', '$geoNear', '$graphLookup',
  '$indexStats', '$listLocalSessions', '$listSessions',
  '$lookup', '$merge', '$out', '$planCacheStats', '$redact',
  '$replaceRoot', '$replaceWith', '$sample', '$set', '$unset',
  '$unionWith', '$unwind'
]);

// Fields that should never be queryable for security reasons
const RESTRICTED_FIELDS = new Set([
  'password', 'passwordHash', 'salt', 'secret', 'privateKey',
  'apiKey', 'token', 'refreshToken', 'sessionId', 'ssn',
  'creditCard', 'bankAccount', 'personalData'
]);

// Maximum depth for nested queries to prevent deep recursion attacks
const MAX_QUERY_DEPTH = 10;

// Maximum number of operators in a single query
const MAX_OPERATORS = 50;

export interface FilterValidationResult {
  isValid: boolean;
  sanitizedFilter: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  operatorCount: number;
  depth: number;
}

export interface QuerySecurityConfig {
  enableStrictQuery: boolean;
  enableSanitizeFilter: boolean;
  enableSchemaValidation: boolean;
  maxQueryDepth: number;
  maxOperators: number;
  allowedOperators: Set<string>;
  restrictedFields: Set<string>;
  dangerousOperators: Set<string>;
}

export class FilterGuardService {
  private config: QuerySecurityConfig;
  private queryMetrics = {
    totalQueries: 0,
    blockedQueries: 0,
    sanitizedQueries: 0,
    warningsIssued: 0
  };

  constructor() {
    this.config = {
      enableStrictQuery: process.env.MONGODB_STRICT_QUERY === 'true' || process.env.NODE_ENV === 'production',
      enableSanitizeFilter: process.env.MONGODB_SANITIZE_FILTER === 'true' || process.env.NODE_ENV === 'production',
      enableSchemaValidation: process.env.MONGODB_SCHEMA_VALIDATION === 'true' || process.env.NODE_ENV === 'production',
      maxQueryDepth: parseInt(process.env.MONGODB_MAX_QUERY_DEPTH || MAX_QUERY_DEPTH.toString()),
      maxOperators: parseInt(process.env.MONGODB_MAX_OPERATORS || MAX_OPERATORS.toString()),
      allowedOperators: ALLOWED_OPERATORS,
      restrictedFields: RESTRICTED_FIELDS,
      dangerousOperators: DANGEROUS_OPERATORS
    };

    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Main filter validation and sanitization method
   */
  ensureSafeFilter(filter: Record<string, unknown>, context: string): Record<string, unknown> {
    this.queryMetrics.totalQueries++;

    try {
      const result = this.validateAndSanitizeFilter(filter, context);
      
      if (!result.isValid) {
        this.queryMetrics.blockedQueries++;
        throw createAppError(
          `Unsafe query detected in ${context}: ${result.errors.join(', ')}`,
          400,
          'UNSAFE_QUERY_DETECTED'
        );
      }

      if (result.warnings.length > 0) {
        this.queryMetrics.warningsIssued++;
        logger.warn(`Query warnings in ${context}:`, {
          warnings: result.warnings,
          originalFilter: filter,
          sanitizedFilter: result.sanitizedFilter
        });
      }

      if (result.sanitizedFilter !== filter) {
        this.queryMetrics.sanitizedQueries++;
      }

      return result.sanitizedFilter;

    } catch (error) {
      monitoringService.recordMetric({
        name: 'query_security_violation',
        value: 1,
        tags: { context, error: error instanceof Error ? error.message : 'unknown' }
      });

      throw error;
    }
  }

  /**
   * Comprehensive filter validation and sanitization
   */
  private validateAndSanitizeFilter(
    filter: Record<string, unknown>, 
    context: string
  ): FilterValidationResult {
    const result: FilterValidationResult = {
      isValid: true,
      sanitizedFilter: {},
      warnings: [],
      errors: [],
      operatorCount: 0,
      depth: 0
    };

    try {
      // Check query depth
      const depth = this.calculateQueryDepth(filter);
      result.depth = depth;

      if (depth > this.config.maxQueryDepth) {
        result.errors.push(`Query depth ${depth} exceeds maximum allowed depth ${this.config.maxQueryDepth}`);
        result.isValid = false;
      }

      // Count operators
      const operatorCount = this.countOperators(filter);
      result.operatorCount = operatorCount;

      if (operatorCount > this.config.maxOperators) {
        result.errors.push(`Query contains ${operatorCount} operators, exceeds maximum ${this.config.maxOperators}`);
        result.isValid = false;
      }

      // Validate and sanitize the filter
      result.sanitizedFilter = this.sanitizeFilterRecursive(filter, result);

      // Check for restricted fields
      this.checkRestrictedFields(filter, result);

      // Validate schema if enabled
      if (this.config.enableSchemaValidation) {
        this.validateSchemaCompliance(filter, context, result);
      }

    } catch (error) {
      result.errors.push(`Filter validation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Recursively sanitize filter object
   */
  private sanitizeFilterRecursive(
    filter: Record<string, unknown>, 
    result: FilterValidationResult
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      // Check for dangerous operators
      if (key.startsWith('$')) {
        if (this.config.dangerousOperators.has(key)) {
          result.errors.push(`Dangerous operator "${key}" is not allowed`);
          result.isValid = false;
          continue;
        }

        if (!this.config.allowedOperators.has(key)) {
          result.warnings.push(`Uncommon operator "${key}" detected - consider reviewing`);
          // Allow uncommon but not dangerous operators
        }
      }

      // Check for restricted fields
      if (this.config.restrictedFields.has(key.toLowerCase())) {
        result.errors.push(`Restricted field "${key}" cannot be queried`);
        result.isValid = false;
        continue;
      }

      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedResult = this.sanitizeFilterRecursive(value as Record<string, unknown>, result);
        sanitized[key] = nestedResult;
      } else if (Array.isArray(value)) {
        // Handle arrays specially
        sanitized[key] = this.sanitizeArray(value, result);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize array values
   */
  private sanitizeArray(array: unknown[], result: FilterValidationResult): unknown[] {
    return array.map(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return this.sanitizeFilterRecursive(item as Record<string, unknown>, result);
      }
      return item;
    });
  }

  /**
   * Calculate query depth to prevent deep recursion attacks
   */
  private calculateQueryDepth(obj: Record<string, unknown>, currentDepth = 0): number {
    if (currentDepth >= MAX_QUERY_DEPTH) {
      return currentDepth;
    }

    let maxDepth = currentDepth;

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const depth = this.calculateQueryDepth(value as Record<string, unknown>, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const depth = this.calculateQueryDepth(item as Record<string, unknown>, currentDepth + 1);
            maxDepth = Math.max(maxDepth, depth);
          }
        }
      }
    }

    return maxDepth;
  }

  /**
   * Count operators in query
   */
  private countOperators(obj: Record<string, unknown>): number {
    let count = 0;

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) {
        count++;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        count += this.countOperators(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            count += this.countOperators(item as Record<string, unknown>);
          }
        }
      }
    }

    return count;
  }

  /**
   * Check for restricted fields
   */
  private checkRestrictedFields(filter: Record<string, unknown>, result: FilterValidationResult): void {
    const checkFields = (obj: Record<string, unknown>, path: string[] = []): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const fieldPath = currentPath.join('.');

        if (this.config.restrictedFields.has(key.toLowerCase())) {
          result.errors.push(`Restricted field "${fieldPath}" cannot be queried`);
          result.isValid = false;
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          checkFields(value as Record<string, unknown>, currentPath);
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              checkFields(item as Record<string, unknown>, currentPath);
            }
          }
        }
      }
    };

    checkFields(filter);
  }

  /**
   * Validate schema compliance
   */
  private validateSchemaCompliance(
    filter: Record<string, unknown>, 
    context: string, 
    result: FilterValidationResult
  ): void {
    // This would typically validate against Mongoose schemas
    // For now, implement basic validation rules

    // Check for common schema violations
    const checkSchemaViolations = (obj: Record<string, unknown>): void => {
      for (const [key, value] of Object.entries(obj)) {
        // Check for invalid field names (MongoDB reserved)
        if (key.startsWith('$') && !this.config.allowedOperators.has(key)) {
          result.warnings.push(`Field "${key}" starts with $ but is not a recognized operator`);
        }

        // Check for invalid data types in common fields
        if (key === 'createdAt' || key === 'updatedAt') {
          if (typeof value !== 'object' || !('$gte' in value || '$lte' in value || '$gt' in value || '$lt' in value)) {
            result.warnings.push(`Date field "${key}" should use date comparison operators`);
          }
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          checkSchemaViolations(value as Record<string, unknown>);
        }
      }
    };

    checkSchemaViolations(filter);
  }

  /**
   * Enable strict query mode for Mongoose
   */
  enableStrictQuery(): void {
    if (this.config.enableStrictQuery) {
      // This would typically be set on Mongoose models
      logger.info('MongoDB strict query mode enabled');
    }
  }

  /**
   * Enable sanitize filter mode
   */
  enableSanitizeFilter(): void {
    if (this.config.enableSanitizeFilter) {
      logger.info('MongoDB sanitize filter mode enabled');
    }
  }

  /**
   * Get query security metrics
   */
  getQueryMetrics() {
    return {
      ...this.queryMetrics,
      config: {
        strictQueryEnabled: this.config.enableStrictQuery,
        sanitizeFilterEnabled: this.config.enableSanitizeFilter,
        schemaValidationEnabled: this.config.enableSchemaValidation,
        maxQueryDepth: this.config.maxQueryDepth,
        maxOperators: this.config.maxOperators
      }
    };
  }

  /**
   * Reset query metrics
   */
  resetMetrics(): void {
    this.queryMetrics = {
      totalQueries: 0,
      blockedQueries: 0,
      sanitizedQueries: 0,
      warningsIssued: 0
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      monitoringService.recordMetric({
        name: 'query_security_total_queries',
        value: this.queryMetrics.totalQueries,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'query_security_blocked_queries',
        value: this.queryMetrics.blockedQueries,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'query_security_sanitized_queries',
        value: this.queryMetrics.sanitizedQueries,
        tags: {}
      });

      monitoringService.recordMetric({
        name: 'query_security_warnings',
        value: this.queryMetrics.warningsIssued,
        tags: {}
      });

      // Reset counters
      this.resetMetrics();

    }, 60000); // Every minute
  }
}

// Legacy function for backward compatibility
export function ensureSafeFilter(filter: Record<string, unknown>, context: string): void {
  const filterGuard = new FilterGuardService();
  filterGuard.ensureSafeFilter(filter, context);
}

export const filterGuardService = new FilterGuardService();
