// src/services/external/performance.service.ts

import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { cacheService } from './cache.service';
import { databaseService } from './database.service';

export interface PerformanceMetrics {
  timestamp: Date;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  cacheHits: number;
  cacheMisses: number;
  dbQueries: number;
  dbQueryTime: number;
  errorCount: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connected: boolean;
    latency: number;
    connections: number;
  };
  cache: {
    connected: boolean;
    latency: number;
    hitRate: number;
  };
  errors: {
    count: number;
    rate: number;
  };
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

/**
 * Advanced performance monitoring and optimization service
 */
export class PerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private startTime = Date.now();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private slowQueries: Array<{ query: string; time: number; timestamp: Date }> = [];

  constructor() {
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    // Only monitor memory usage in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
          console.warn('⚠️ High memory usage detected:', {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
          });
        }
      }, 30000); // Check every 30 seconds
    }

    // Cleanup old metrics
    setInterval(() => {
      this.cleanupMetrics();
    }, 300000); // Cleanup every 5 minutes
  }

  /**
   * Track request performance
   */
  trackRequest(req: Request, res: Response, startTime: number): void {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.requestCount++;

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] as string || this.generateRequestId(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      cacheHits: 0, // Will be updated by cache service
      cacheMisses: 0, // Will be updated by cache service
      dbQueries: 0, // Will be updated by database service
      dbQueryTime: 0, // Will be updated by database service
      errorCount: res.statusCode >= 400 ? 1 : 0
    };

    if (res.statusCode >= 400) {
      this.errorCount++;
    }

    // Track slow requests
    if (responseTime > 1000) {
      console.warn(`🐌 Slow request detected: ${req.method} ${req.path} (${responseTime.toFixed(2)}ms)`);
    }

    this.metrics.push(metrics);
  }

  /**
   * Track database query performance
   */
  trackQuery(query: string, executionTime: number): void {
    if (executionTime > 100) {
      this.slowQueries.push({
        query: query.substring(0, 100), // Truncate long queries
        time: executionTime,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = Date.now() - this.startTime;

    // Database health
    const dbHealth = await databaseService.healthCheck();
    
    // Cache health
    const cacheHealth = await cacheService.healthCheck();
    const cacheStats = await cacheService.getStats();

    // Calculate error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!dbHealth.healthy || !cacheHealth.healthy || errorRate > 10) {
      status = 'unhealthy';
    } else if (memUsage.heapUsed / memUsage.heapTotal > 0.8 || errorRate > 5) {
      status = 'degraded';
    }

    return {
      status,
      uptime,
      memory: {
        used: memUsage.heapUsed,
        free: memUsage.heapTotal - memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to seconds
        loadAverage: require('os').loadavg()
      },
      database: {
        connected: dbHealth.healthy,
        latency: dbHealth.latency,
        connections: 0 // Would need to get from mongoose
      },
      cache: {
        connected: cacheHealth.healthy,
        latency: cacheHealth.latency,
        hitRate: cacheStats.hitRate
      },
      errors: {
        count: this.errorCount,
        rate: errorRate
      }
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): PerformanceMetrics[] {
    if (timeRange) {
      return this.metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }
    return this.metrics.slice(-1000); // Return last 1000 metrics
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
    memoryUsage: number;
    uptime: number;
  } {
    const recentMetrics = this.metrics.slice(-100); // Last 100 requests
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const slowRequests = recentMetrics.filter(m => m.responseTime > 1000).length;
    const memUsage = process.memoryUsage();

    return {
      totalRequests: this.requestCount,
      averageResponseTime: recentMetrics.length > 0 ? totalResponseTime / recentMetrics.length : 0,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      slowRequests,
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Circuit breaker implementation
   */
  async executeWithCircuitBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number;
      timeout?: number;
      resetTimeout?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      timeout = 5000,
      resetTimeout = 60000
    } = options;

    let breaker = this.circuitBreakers.get(key);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0
      };
      this.circuitBreakers.set(key, breaker);
    }

    // Check if circuit is open
    if (breaker.state === 'open') {
      if (Date.now() < breaker.nextAttemptTime) {
        throw new Error(`Circuit breaker is open for ${key}. Next attempt at ${new Date(breaker.nextAttemptTime)}`);
      } else {
        breaker.state = 'half-open';
        breaker.successCount = 0;
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);

      // Success - reset circuit breaker
      breaker.failureCount = 0;
      breaker.successCount++;
      
      if (breaker.state === 'half-open' && breaker.successCount >= 3) {
        breaker.state = 'closed';
      }

      return result;
    } catch (error) {
      // Failure - increment failure count
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failureCount >= failureThreshold) {
        breaker.state = 'open';
        breaker.nextAttemptTime = Date.now() + resetTimeout;
      }

      throw error;
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): Array<{ query: string; time: number; timestamp: Date }> {
    return this.slowQueries.slice(-50); // Return last 50 slow queries
  }

  /**
   * Optimize performance
   */
  async optimizePerformance(): Promise<{
    memoryOptimized: boolean;
    cacheOptimized: boolean;
    databaseOptimized: boolean;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    let memoryOptimized = false;
    let cacheOptimized = false;
    let databaseOptimized = false;

    // Memory optimization
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed / memUsage.heapTotal > 0.8) {
      if (global.gc) {
        global.gc();
        memoryOptimized = true;
        recommendations.push('Garbage collection triggered');
      } else {
        recommendations.push('Consider enabling garbage collection with --expose-gc');
      }
    }

    // Cache optimization
    const cacheStats = await cacheService.getStats();
    if (cacheStats.hitRate < 70) {
      recommendations.push('Cache hit rate is low. Consider increasing cache TTL or improving cache keys');
    } else {
      cacheOptimized = true;
    }

    // Database optimization
    try {
      await databaseService.optimizeIndexes();
      databaseOptimized = true;
      recommendations.push('Database indexes optimized');
    } catch (error) {
      recommendations.push('Failed to optimize database indexes');
    }

    return {
      memoryOptimized,
      cacheOptimized,
      databaseOptimized,
      recommendations
    };
  }

  /**
   * Cleanup old metrics
   */
  private cleanupMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
    this.slowQueries = this.slowQueries.filter(q => q.timestamp.getTime() > cutoff);
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const performanceService = new PerformanceService();
