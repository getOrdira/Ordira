// @ts-nocheck
// src/middleware/performance.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { performanceService } from '../services/external/performance.service';
import { cacheService } from '../services/external/cache.service';

export interface PerformanceRequest extends Request {
  startTime?: number;
  requestId?: string;
}

/**
 * Performance tracking middleware
 */
export function performanceMiddleware(
  req: PerformanceRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = performance.now();
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.startTime = startTime;
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.set('X-Request-ID', requestId);
  
  // Track when response finishes
  res.on('finish', () => {
    performanceService.trackRequest(req, res, startTime);
  });
  
  next();
}

/**
 * Cache middleware for GET requests
 */
export function cacheMiddleware(ttl: number = 300, keyGenerator?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = keyGenerator ? keyGenerator(req) : `cache:${req.path}:${JSON.stringify(req.query)}`;
      
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, { ttl });
      
      if (cached !== null) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.json(cached);
        return;
      }
      
      // Store original send function
      const originalSend = res.send;
      let responseData: any;
      
      // Override send to capture response data
      res.send = function(data: any) {
        responseData = data;
        return originalSend.call(this, data);
      };
      
      // Continue to next middleware
      res.on('finish', async () => {
        if (res.statusCode === 200 && responseData) {
          // Cache successful responses
          await cacheService.set(cacheKey, responseData, { ttl });
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', cacheKey);
        }
      });
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Compression middleware with optimization
 */
export function compressionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip compression for small responses
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (data && Buffer.byteLength(JSON.stringify(data), 'utf8') > 1024) {
      // Only compress responses larger than 1KB
      res.set('Content-Encoding', 'gzip');
    }
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Request size limiting middleware
 */
export function requestSizeMiddleware(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLengthHeader = req.get('content-length');
    const contentLength = parseInt(Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : contentLengthHeader || '0', 10);
    
    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`,
        actualSize: `${Math.round(contentLength / 1024 / 1024)}MB`
      });
      return;
    }
    
    next();
  };
}

/**
 * Response time optimization middleware
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
    
    // Add performance warnings for slow responses
    if (duration > 1000) {
      res.set('X-Performance-Warning', 'Slow response detected');
    }
  });
  
  next();
}

/**
 * Database query optimization middleware
 */
export function queryOptimizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add query hints for common patterns
  if (req.query.limit && parseInt(req.query.limit as string) > 100) {
    res.set('X-Query-Warning', 'Large result set requested');
  }
  
  if (req.query.sort && typeof req.query.sort === 'string') {
    // Validate sort fields to prevent injection
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'status'];
    const sortFields = req.query.sort.split(',');
    
    const invalidFields = sortFields.filter(field => 
      !allowedSortFields.includes(field.replace(/^-/, ''))
    );
    
    if (invalidFields.length > 0) {
      res.status(400).json({
        error: 'Invalid sort fields',
        invalidFields,
        allowedFields: allowedSortFields
      });
      return;
    }
  }
  
  next();
}

/**
 * Memory usage monitoring middleware
 */
export function memoryMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  res.set('X-Memory-Usage', `${heapUsedMB}MB / ${heapTotalMB}MB`);
  
  // Add memory warning if usage is high
  if (memUsage.heapUsed / memUsage.heapTotal > 0.8) {
    res.set('X-Memory-Warning', 'High memory usage detected');
  }
  
  next();
}

/**
 * Circuit breaker middleware
 */
export function circuitBreakerMiddleware(serviceName: string, options: {
  failureThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await performanceService.executeWithCircuitBreaker(
        serviceName,
        () => new Promise<void>((resolve) => {
          // Store original next function
          const originalNext = next;
          
          // Override next to resolve promise
          next = function() {
            resolve();
            return originalNext.apply(this, arguments);
          };
          
          // Call original next
          originalNext();
        }),
        options
      );
    } catch (error) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceName,
        reason: 'Circuit breaker is open',
        retryAfter: options.resetTimeout || 60000
      });
    }
  };
}

/**
 * Request deduplication middleware
 */
export function deduplicationMiddleware(ttl: number = 60) {
  const pendingRequests = new Map<string, Promise<any>>();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only deduplicate GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const requestKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    
    // Check if same request is already pending
    if (pendingRequests.has(requestKey)) {
      try {
        const result = await pendingRequests.get(requestKey);
        res.json(result);
        return;
      } catch (error) {
        // If pending request failed, continue with new request
        pendingRequests.delete(requestKey);
      }
    }
    
    // Create new request promise
    const requestPromise = new Promise<any>((resolve, reject) => {
      const originalSend = res.send;
      let responseData: any;
      
      res.send = function(data: any) {
        responseData = data;
        return originalSend.call(this, data);
      };
      
      res.on('finish', () => {
        if (res.statusCode === 200) {
          resolve(responseData);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}`));
        }
        
        // Clean up after TTL
        setTimeout(() => {
          pendingRequests.delete(requestKey);
        }, ttl * 1000);
      });
      
      next();
    });
    
    pendingRequests.set(requestKey, requestPromise);
  };
}

/**
 * Health check middleware
 */
export async function healthCheckMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path === '/health' || req.path === '/healthz') {
    try {
      const health = await performanceService.getSystemHealth();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        status: health.status,
        timestamp: new Date().toISOString(),
        uptime: health.uptime,
        memory: health.memory,
        database: health.database,
        cache: health.cache,
        errors: health.errors
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    next();
  }
}
