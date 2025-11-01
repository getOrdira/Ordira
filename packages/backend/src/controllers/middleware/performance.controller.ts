// src/controllers/middleware/performance.controller.ts
// Controller exposing performance monitoring and metrics operations

import { Response } from 'express';
import { MiddlewareBaseController, MiddlewareBaseRequest } from './middlewareBase.controller';
import { getMetricsJSON } from '../../middleware/deprecated/metrics.middleware';

interface OptimizeRequest extends MiddlewareBaseRequest {}

/**
 * PerformanceController surfaces observability insights collected by middleware services.
 */
export class PerformanceController extends MiddlewareBaseController {
  /**
   * Retrieve overall system health status.
   */
  async getSystemHealth(req: MiddlewareBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_GET_SYSTEM_HEALTH');

      const health = await this.performanceService.getSystemHealth();

      this.logAction(req, 'MIDDLEWARE_GET_SYSTEM_HEALTH_SUCCESS', {
        status: health.status,
        uptime: health.uptime
      });

      return {
        health
      };
    }, res, 'System health retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve recent slow query information captured by the performance service.
   */
  async getSlowQueries(req: MiddlewareBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_GET_SLOW_QUERIES');

      const slowQueries = this.performanceService.getSlowQueries();

      this.logAction(req, 'MIDDLEWARE_GET_SLOW_QUERIES_SUCCESS', {
        count: slowQueries.length
      });

      return {
        slowQueries
      };
    }, res, 'Slow query list retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Execute optimization routines for memory, cache, and database health.
   */
  async optimizePerformance(req: OptimizeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_OPTIMIZE_PERFORMANCE');

      const result = await this.performanceService.optimizePerformance();

      this.logAction(req, 'MIDDLEWARE_OPTIMIZE_PERFORMANCE_SUCCESS', result);

      return {
        result
      };
    }, res, 'Performance optimization executed successfully', this.getRequestMeta(req));
  }

  /**
   * Return Prometheus metrics as JSON for debugging or UI consumption.
   */
  async getMetricsSnapshot(req: MiddlewareBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_GET_METRICS_SNAPSHOT');

      const metrics = await getMetricsJSON();

      this.logAction(req, 'MIDDLEWARE_GET_METRICS_SNAPSHOT_SUCCESS', {
        metricsCount: Array.isArray(metrics) ? metrics.length : 0
      });

      return {
        metrics
      };
    }, res, 'Metrics snapshot retrieved successfully', this.getRequestMeta(req));
  }
}

export const performanceController = new PerformanceController();

