/**
 * Request Logging Middleware
 * 
 * Comprehensive, production-ready request/response logging with:
 * - Request correlation ID generation and propagation
 * - Structured JSON logging with automatic sanitization
 * - Performance tracking (duration, memory usage)
 * - Error context enrichment
 * - Security-aware logging
 * - High-performance optimizations for production
 * 
 */

import { Request, Response, NextFunction } from 'express';
import { logger, LogContext, LogLevel } from '../../utils/logger';
import { sanitizeRequestData } from '../../utils/dataSanitizer';
import type { BaseRequest } from '../../controllers/core/base.controller';

// ===== TYPE DEFINITIONS =====

/**
 * Extended Request interface with logging metadata
 */
interface LoggingRequest extends BaseRequest {
  requestId?: string;
  startTime?: bigint;
  startMemory?: NodeJS.MemoryUsage;
  userId?: string;
  businessId?: string;
  tenant?: {
    business?: {
      toString(): string;
    };
  };
}

/**
 * Logging configuration options
 */
export interface LoggingMiddlewareOptions {
  /**
   * Enable/disable request logging (default: true)
   */
  enabled?: boolean;
  
  /**
   * Log level for successful requests (default: 'info')
   */
  logLevel?: LogLevel;
  
  /**
   * Log level for failed requests (default: 'error')
   */
  errorLogLevel?: LogLevel;
  
  /**
   * Enable performance logging (default: true)
   */
  logPerformance?: boolean;
  
  /**
   * Enable memory usage tracking (default: true)
   */
  logMemory?: boolean;
  
  /**
   * Skip logging for health check endpoints (default: true)
   */
  skipHealthChecks?: boolean;
  
  /**
   * Skip logging for static file requests (default: true)
   */
  skipStatic?: boolean;
  
  /**
   * Maximum body size to log in bytes (default: 10KB)
   */
  maxBodySize?: number;
  
  /**
   * Request duration threshold for slow request warnings in ms (default: 1000)
   */
  slowRequestThreshold?: number;
  
  /**
   * Memory delta threshold for memory warning in bytes (default: 50MB)
   */
  memoryThreshold?: number;
  
  /**
   * Custom request ID generator
   */
  generateRequestId?: (req: Request) => string;
  
  /**
   * Custom log formatter
   */
  formatter?: (req: Request, res: Response, duration: number) => any;
  
  /**
   * Paths to exclude from logging
   */
  excludePaths?: string[];
  
  /**
   * Enable request body logging (default: false for security)
   */
  logBody?: boolean;
  
  /**
   * Enable query parameter logging (default: true)
   */
  logQuery?: boolean;
  
  /**
   * Enable headers logging (default: false for security)
   */
  logHeaders?: boolean;
}

/**
 * Default logging configuration
 */
const DEFAULT_OPTIONS: Required<LoggingMiddlewareOptions> = {
  enabled: true,
  logLevel: LogLevel.INFO,
  errorLogLevel: LogLevel.ERROR,
  logPerformance: true,
  logMemory: true,
  skipHealthChecks: true,
  skipStatic: true,
  maxBodySize: 10240, // 10KB
  slowRequestThreshold: 1000,
  memoryThreshold: 50 * 1024 * 1024, // 50MB
  generateRequestId: generateUniqueRequestId,
  formatter: defaultFormatter,
  excludePaths: [],
  logBody: false,
  logQuery: true,
  logHeaders: false
};

// ===== REQUEST ID GENERATION =====

/**
 * Generate a unique request ID using timestamp and random string
 */
function generateUniqueRequestId(req: Request): string {
  // Use existing request ID if provided by load balancer/proxy
  const existingId = req.headers['x-request-id'] || 
                     req.headers['x-correlation-id'] ||
                     req.headers['x-trace-id'];
  
  if (existingId && typeof existingId === 'string') {
    return existingId;
  }
  
  // Generate new unique ID: timestamp-randomString
  const timestamp = Date.now().toString(36);
  const randomString = Math.random().toString(36).substring(2, 11);
  
  return `${timestamp}-${randomString}`;
}

// ===== HELPER FUNCTIONS =====

/**
 * Check if path should be excluded from logging
 */
function shouldSkipLogging(req: LoggingRequest, options: Required<LoggingMiddlewareOptions>): boolean {
  const path = req.path.toLowerCase();
  
  // Check explicit exclude paths
  if (options.excludePaths.some(excludedPath => path.includes(excludedPath))) {
    return true;
  }
  
  // Skip health checks
  if (options.skipHealthChecks && (path === '/health' || path === '/healthz' || path === '/ping')) {
    return true;
  }
  
  // Skip static file requests
  if (options.skipStatic && req.path.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|js|css|map)$/i)) {
    return true;
  }
  
  return false;
}

/**
 * Default log formatter
 */
function defaultFormatter(req: LoggingRequest, res: Response, duration: number): any {
  const context: LogContext = {
    requestId: req.requestId,
    method: req.method,
    endpoint: req.path,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.userId,
    businessId: req.businessId,
    tenantId: req.tenant?.business?.toString()
  };
  
  return context;
}

/**
 * Get sanitized request body
 */
function getSanitizedBody(req: LoggingRequest, options: Required<LoggingMiddlewareOptions>): any {
  if (!options.logBody || !req.body) {
    return undefined;
  }
  
  // Get body size estimation
  const bodyStr = JSON.stringify(req.body);
  const bodySize = Buffer.byteLength(bodyStr, 'utf8');
  
  if (bodySize > options.maxBodySize) {
    return {
      _truncated: true,
      _size: bodySize,
      _message: 'Request body exceeds maximum log size'
    };
  }
  
  // Sanitize and return body
  return sanitizeRequestData({ body: req.body }).body;
}

/**
 * Get sanitized query parameters
 */
function getSanitizedQuery(req: LoggingRequest, options: Required<LoggingMiddlewareOptions>): any {
  if (!options.logQuery || !req.query || Object.keys(req.query).length === 0) {
    return undefined;
  }
  
  return sanitizeRequestData({ query: req.query }).query;
}

/**
 * Get sanitized headers
 */
function getSanitizedHeaders(req: LoggingRequest, options: Required<LoggingMiddlewareOptions>): any {
  if (!options.logHeaders) {
    return undefined;
  }
  
  // Only log safe headers (exclude sensitive ones)
  const safeHeaders: Record<string, any> = {};
  const safeHeaderNames = [
    'content-type',
    'content-length',
    'accept',
    'user-agent',
    'referer',
    'origin',
    'host',
    'x-forwarded-for',
    'x-real-ip'
  ];
  
  for (const headerName of safeHeaderNames) {
    if (req.headers[headerName]) {
      safeHeaders[headerName] = req.headers[headerName];
    }
  }
  
  return Object.keys(safeHeaders).length > 0 ? safeHeaders : undefined;
}

/**
 * Calculate memory delta
 */
function calculateMemoryDelta(req: LoggingRequest): number {
  if (!req.startMemory) {
    return 0;
  }
  
  const endMemory = process.memoryUsage().heapUsed;
  return endMemory - req.startMemory.heapUsed;
}

/**
 * Check if request is slow
 */
function isSlowRequest(duration: number, threshold: number): boolean {
  return duration >= threshold;
}

/**
 * Check if request used excessive memory
 */
function isMemoryIntensive(memoryDelta: number, threshold: number): boolean {
  return Math.abs(memoryDelta) >= threshold;
}

// ===== MAIN MIDDLEWARE FUNCTION =====

/**
 * Request logging middleware
 * 
 * Creates comprehensive request/response logs with:
 * - Correlation ID propagation
 * - Performance tracking
 * - Memory monitoring
 * - Automatic sanitization
 * - Error context enrichment
 */
export function loggingMiddleware(options: LoggingMiddlewareOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  // Merge options with defaults
  const config: Required<LoggingMiddlewareOptions> = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging if disabled
    if (!config.enabled) {
      return next();
    }
    
    const loggingReq = req as LoggingRequest;
    
    // Skip logging for excluded paths
    if (shouldSkipLogging(loggingReq, config)) {
      return next();
    }
    
    // Generate and attach request ID
    loggingReq.requestId = config.generateRequestId(req);
    
    // Store request start time (high-resolution)
    loggingReq.startTime = process.hrtime.bigint();
    
    // Store initial memory usage if memory tracking enabled
    if (config.logMemory) {
      loggingReq.startMemory = process.memoryUsage();
    }
    
    // Add request ID to response headers for client tracking
    res.setHeader('X-Request-ID', loggingReq.requestId);
    
    // Override response.end to capture completion
    const originalEnd = res.end.bind(res);
    
    res.end = function(chunk?: any, encoding?: any): Response {
      // Calculate duration using high-resolution timer
      const durationNanos = loggingReq.startTime 
        ? process.hrtime.bigint() - loggingReq.startTime 
        : BigInt(0);
      const duration = Number(durationNanos) / 1_000_000; // Convert to milliseconds
      
      // Build comprehensive log context
      const logContext = config.formatter(loggingReq, res, duration);
      
      // Add optional context fields
      if (config.logBody) {
        const body = getSanitizedBody(loggingReq, config);
        if (body) {
          logContext.body = body;
        }
      }
      
      if (config.logQuery) {
        const query = getSanitizedQuery(loggingReq, config);
        if (query) {
          logContext.query = query;
        }
      }
      
      if (config.logHeaders) {
        const headers = getSanitizedHeaders(loggingReq, config);
        if (headers) {
          logContext.headers = headers;
        }
      }
      
      // Determine log level based on status code
      const isError = res.statusCode >= 400;
      const logLevel = isError ? config.errorLogLevel : config.logLevel;
      
      // Add performance and memory metrics
      if (config.logPerformance) {
        logContext.performance = {
          duration: Math.round(duration * 100) / 100, // Round to 2 decimals
          isSlow: isSlowRequest(duration, config.slowRequestThreshold)
        };
      }
      
      if (config.logMemory && loggingReq.startMemory) {
        const memoryDelta = calculateMemoryDelta(loggingReq);
        logContext.performance = {
          ...logContext.performance,
          memoryDelta: Math.round(memoryDelta / 1024 / 1024 * 100) / 100, // MB with 2 decimals
          isMemoryIntensive: isMemoryIntensive(memoryDelta, config.memoryThreshold)
        };
      }
      
      // Log the request
      if (isError) {
        logger.error(
          `${req.method} ${req.path} - ${res.statusCode}`,
          logContext
        );
      } else if (config.logLevel === LogLevel.DEBUG || config.logLevel === LogLevel.TRACE) {
        logger.debug(
          `${req.method} ${req.path} - ${res.statusCode}`,
          logContext
        );
      } else {
        logger.info(
          `${req.method} ${req.path} - ${res.statusCode}`,
          logContext
        );
      }
      
      // Warn about slow requests
      if (config.logPerformance && isSlowRequest(duration, config.slowRequestThreshold)) {
        logger.warn('Slow request detected', {
          ...logContext,
          event: 'performance.slow_request'
        });
      }
      
      // Warn about memory-intensive requests
      if (config.logMemory && loggingReq.startMemory) {
        const memoryDelta = calculateMemoryDelta(loggingReq);
        if (isMemoryIntensive(memoryDelta, config.memoryThreshold)) {
          logger.warn('Memory-intensive request detected', {
            ...logContext,
            event: 'performance.memory_intensive'
          });
        }
      }
      
      // Call original end function
      return originalEnd(chunk, encoding);
    };
    
    next();
  };
}

// ===== CONVENIENCE EXPORTS =====

/**
 * Production-ready logging middleware with sensible defaults
 */
export const productionLoggingMiddleware = loggingMiddleware({
  enabled: true,
  logLevel: LogLevel.INFO,
  errorLogLevel: LogLevel.ERROR,
  logPerformance: true,
  logMemory: true,
  skipHealthChecks: true,
  skipStatic: true,
  logBody: false,
  logQuery: true,
  logHeaders: false,
  slowRequestThreshold: 1000,
  memoryThreshold: 50 * 1024 * 1024
});

/**
 * Development logging middleware with more verbose output
 */
export const developmentLoggingMiddleware = loggingMiddleware({
  enabled: true,
  logLevel: LogLevel.DEBUG,
  errorLogLevel: LogLevel.ERROR,
  logPerformance: true,
  logMemory: true,
  skipHealthChecks: false,
  skipStatic: false,
  logBody: true,
  logQuery: true,
  logHeaders: true,
  slowRequestThreshold: 500,
  memoryThreshold: 10 * 1024 * 1024,
  maxBodySize: 51200 // 50KB for development
});

/**
 * Minimal logging middleware for high-traffic endpoints
 */
export const minimalLoggingMiddleware = loggingMiddleware({
  enabled: true,
  logLevel: LogLevel.INFO,
  errorLogLevel: LogLevel.ERROR,
  logPerformance: false,
  logMemory: false,
  skipHealthChecks: true,
  skipStatic: true,
  logBody: false,
  logQuery: false,
  logHeaders: false
});

/**
 * Audit logging middleware for compliance and security
 */
export const auditLoggingMiddleware = loggingMiddleware({
  enabled: true,
  logLevel: LogLevel.INFO,
  errorLogLevel: LogLevel.ERROR,
  logPerformance: true,
  logMemory: false,
  skipHealthChecks: true,
  skipStatic: true,
  logBody: true,
  logQuery: true,
  logHeaders: true,
  slowRequestThreshold: 2000,
  maxBodySize: 102400 // 100KB for audit logs
});

