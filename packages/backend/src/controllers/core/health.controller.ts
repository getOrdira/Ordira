// src/controllers/core/health.controller.ts
// System health controller using modular infrastructure services

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BaseController, BaseRequest } from './base.controller';
import { redisClusterService } from '../../services/infrastructure/cache/core/redisClusterConnection.service';
import { LogLevel } from '../../utils/logger';

/**
 * Health check request interface
 */
interface HealthRequest extends BaseRequest {
  validatedQuery?: {
    detailed?: boolean;
    checks?: string[];
  };
}

/**
 * Health check response interface
 */
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    memory: HealthStatus;
    disk: HealthStatus;
  };
  metrics?: {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  details?: any;
}

/**
 * Health controller
 */
export class HealthController extends BaseController {
  /**
   * GET /api/health
   * Basic health check endpoint
   */
  async basicHealth(req: HealthRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'BASIC_HEALTH_CHECK');

      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: { status: 'healthy' },
          redis: { status: 'healthy' },
          memory: { status: 'healthy' },
          disk: { status: 'healthy' }
        }
      };

      this.logAction(req, 'HEALTH_CHECK_SUCCESS', {
        status: result.status,
        uptime: result.uptime
      });

      return result;
    }, res, 'Health check successful', this.getRequestMeta(req));
  }

  /**
   * GET /api/health/detailed
   * Detailed health check endpoint
   */
  async detailedHealth(req: HealthRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DETAILED_HEALTH_CHECK');

      const startTime = Date.now();
      const checks = await this.performHealthChecks();
      const responseTime = Date.now() - startTime;

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks,
        metrics: {
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage().user / 1000000 // Convert to seconds
        }
      };

      // Use logSafe for detailed checks - may contain connection details
      this.logger.logSafe(LogLevel.INFO, 'DETAILED_HEALTH_CHECK_SUCCESS', checks, {
        status: result.status,
        responseTime: result.metrics?.responseTime,
        checksCount: Object.keys(checks).length,
        requestId: req.headers['x-request-id']
      });

      return result;
    }, res, 'Detailed health check completed', this.getRequestMeta(req));
  }

  /**
   * GET /api/health/ready
   * Readiness probe endpoint
   */
  async readiness(req: HealthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.recordPerformance(req, 'READINESS_CHECK');

      // Check critical services only
      const criticalChecks = await this.performCriticalChecks();
      const isReady = Object.values(criticalChecks).every(check => check.status === 'healthy');

      const result = {
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: criticalChecks
      };

      // Use logSafe for checks which may contain connection details
      this.logger.logSafe(LogLevel.INFO, 'READINESS_CHECK_SUCCESS', criticalChecks, {
        ready: isReady,
        checksCount: Object.keys(criticalChecks).length,
        requestId: req.headers['x-request-id']
      });

      // Use sendSuccess with appropriate status code
      this.sendSuccess(
        res,
        result,
        isReady ? 'Service is ready' : 'Service is not ready',
        this.getRequestMeta(req),
        isReady ? 200 : 503
      );
    } catch (error) {
      this.sendError(res, error as Error, 503);
    }
  }

  /**
   * GET /api/health/live
   * Liveness probe endpoint
   */
  async liveness(req: HealthRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'LIVENESS_CHECK');

      const result = {
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        pid: process.pid
      };

      this.logAction(req, 'LIVENESS_CHECK_SUCCESS', {
        uptime: result.uptime,
        pid: result.pid
      });

      return result;
    }, res, 'Service is alive', this.getRequestMeta(req));
  }

  /**
   * Perform comprehensive health checks
   * Uses logSafe for any potentially sensitive connection information
   */
  private async performHealthChecks(): Promise<HealthCheckResult['checks']> {
    const checks: HealthCheckResult['checks'] = {
      database: { status: 'healthy' },
      redis: { status: 'healthy' },
      memory: { status: 'healthy' },
      disk: { status: 'healthy' }
    };

    // Database check using mongoose
    try {
      const dbStart = Date.now();
      await mongoose.connection.db.admin().ping();
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart
      };
    } catch (error: any) {
      // Sanitize error messages - may contain connection details
      const errorMessage = error instanceof Error ? error.message : 'Database connection failed';
      
      checks.database = {
        status: 'unhealthy',
        message: 'Database connection failed',
        details: {
          errorType: error?.name || 'Unknown',
          // Never log actual connection strings or credentials
          hasError: !!error
        }
      };
    }

    // Redis check using redisClusterService
    try {
      const redisStart = Date.now();
      const redisHealth = await redisClusterService.healthCheck();
      checks.redis = {
        status: redisHealth.healthy ? 'healthy' : 'unhealthy',
        responseTime: redisHealth.latency,
        details: {
          cluster: redisHealth.cluster
          // Never log connection details or cluster nodes
        }
      };
    } catch (error: any) {
      // Sanitize error messages
      const errorMessage = error instanceof Error ? error.message : 'Redis connection failed';
      
      checks.redis = {
        status: 'unhealthy',
        message: 'Redis connection failed',
        details: {
          errorType: error?.name || 'Unknown',
          hasError: !!error
          // Never log connection strings, passwords, or cluster details
        }
      };
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      checks.memory = {
        status: 'unhealthy',
        message: 'High memory usage',
        details: { usagePercent: Math.round(memoryUsagePercent) }
      };
    } else if (memoryUsagePercent > 80) {
      checks.memory = {
        status: 'degraded',
        message: 'Elevated memory usage',
        details: { usagePercent: Math.round(memoryUsagePercent) }
      };
    } else {
      checks.memory = {
        status: 'healthy',
        details: { usagePercent: Math.round(memoryUsagePercent) }
      };
    }

    // Disk check (simplified)
    try {
      const fs = require('fs');
      fs.accessSync(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
      checks.disk = { status: 'healthy' };
    } catch (error: any) {
      // Sanitize error - may contain file paths
      checks.disk = {
        status: 'unhealthy',
        message: 'Disk access failed',
        details: {
          errorType: error?.name || 'Unknown',
          hasError: !!error
          // Never log full file paths that might contain sensitive data
        }
      };
    }

    return checks;
  }

  /**
   * Perform critical health checks only
   * Uses safe error handling to prevent sensitive data exposure
   */
  private async performCriticalChecks(): Promise<Partial<HealthCheckResult['checks']>> {
    const checks: Partial<HealthCheckResult['checks']> = {};

    // Database check (critical)
    try {
      await mongoose.connection.db.admin().ping();
      checks.database = { status: 'healthy' };
    } catch (error: any) {
      // Never log connection strings, credentials, or full error messages
      checks.database = {
        status: 'unhealthy',
        message: 'Database connection failed'
        // Error details are intentionally omitted to prevent sensitive data exposure
      };
    }

    // Redis check (critical)
    try {
      const redisHealth = await redisClusterService.healthCheck();
      checks.redis = {
        status: redisHealth.healthy ? 'healthy' : 'unhealthy'
        // Connection details are intentionally omitted
      };
    } catch (error: any) {
      // Never log connection strings, passwords, or cluster details
      checks.redis = {
        status: 'unhealthy',
        message: 'Redis connection failed'
        // Error details are intentionally omitted to prevent sensitive data exposure
      };
    }

    return checks;
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Export controller instance
export const healthController = new HealthController();
