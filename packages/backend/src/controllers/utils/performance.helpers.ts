// src/controllers/utils/performance.helpers.ts
// Performance monitoring utilities for controllers

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cacheHit?: boolean;
  databaseQueries?: number;
  externalApiCalls?: number;
}

/**
 * Performance helper class
 */
export class PerformanceHelpers {
  private static metrics: Map<string, PerformanceMetrics> = new Map();

  /**
   * Start performance monitoring
   */
  static startMonitoring(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.headers['x-request-id'] as string || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metrics: PerformanceMetrics = {
      requestId,
      method: req.method,
      url: req.url,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage()
    };

    PerformanceHelpers.metrics.set(requestId, metrics);
    
    // Add request ID to headers
    res.setHeader('X-Request-ID', requestId);
    
    // Store metrics in request for access in controllers
    (req as any).performanceMetrics = metrics;
    
    next();
  }

  /**
   * End performance monitoring
   */
  static endMonitoring(req: Request, res: Response, next: NextFunction): void {
    const metrics = (req as any).performanceMetrics as PerformanceMetrics;
    
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.memoryUsage = process.memoryUsage();

      // Log performance metrics
      PerformanceHelpers.logMetrics(metrics);

      // Add performance headers
      res.setHeader('X-Response-Time', `${metrics.duration}ms`);
      res.setHeader('X-Memory-Usage', `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);

      // Clean up
      PerformanceHelpers.metrics.delete(metrics.requestId);
    }

    next();
  }

  /**
   * Log performance metrics
   */
  private static logMetrics(metrics: PerformanceMetrics): void {
    const logData = {
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      duration: metrics.duration,
      memoryUsage: metrics.memoryUsage,
      cacheHit: metrics.cacheHit,
      databaseQueries: metrics.databaseQueries,
      externalApiCalls: metrics.externalApiCalls
    };

    if (metrics.duration && metrics.duration > 1000) {
      logger.warn('Slow request detected', logData);
    } else {
      logger.info('Request performance', logData);
    }
  }

  /**
   * Record cache hit
   */
  static recordCacheHit(req: Request): void {
    const metrics = (req as any).performanceMetrics as PerformanceMetrics;
    if (metrics) {
      metrics.cacheHit = true;
    }
  }

  /**
   * Record database query
   */
  static recordDatabaseQuery(req: Request): void {
    const metrics = (req as any).performanceMetrics as PerformanceMetrics;
    if (metrics) {
      metrics.databaseQueries = (metrics.databaseQueries || 0) + 1;
    }
  }

  /**
   * Record external API call
   */
  static recordExternalApiCall(req: Request): void {
    const metrics = (req as any).performanceMetrics as PerformanceMetrics;
    if (metrics) {
      metrics.externalApiCalls = (metrics.externalApiCalls || 0) + 1;
    }
  }

  /**
   * Get current performance metrics
   */
  static getMetrics(req: Request): PerformanceMetrics | undefined {
    return (req as any).performanceMetrics as PerformanceMetrics;
  }

  /**
   * Create performance decorator
   */
  static performanceDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.call(this, req, res, next);
        const duration = Date.now() - startTime;
        
        PerformanceHelpers.recordDatabaseQuery(req);
        
        logger.info(`Controller method ${propertyKey} completed`, {
          duration,
          method: req.method,
          url: req.url
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(`Controller method ${propertyKey} failed`, {
          duration,
          error: error.message,
          method: req.method,
          url: req.url
        });
        
        throw error;
      }
    };

    return descriptor;
  }
}
