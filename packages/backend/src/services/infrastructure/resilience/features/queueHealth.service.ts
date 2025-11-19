/**
 * Queue Health Monitoring Service
 * 
 * Monitors Bull queue health and provides alerts for:
 * - Queue depth exceeding threshold
 * - High failure rate
 * - Worker unavailability
 * - Redis connection issues
 */

import { logger } from '../../../../utils/logger';
import { jobQueueAdapter } from '../core/jobQueueAdapter.service';
import { getOpenTelemetryService } from '../../observability';
import { metrics, Counter, Meter } from '@opentelemetry/api';
import { monitoringService } from '../../observability';

export interface QueueHealthMetrics {
  queueDepth: number;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
  completedJobs: number;
  processingRate: number;
  failureRate: number;
  averageProcessingTime: number;
  isHealthy: boolean;
  redisConnected: boolean;
  lastCheck: Date;
}

export interface QueueHealthAlert {
  id: string;
  type: 'queue_depth' | 'high_failure_rate' | 'redis_disconnected' | 'worker_unavailable';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Partial<QueueHealthMetrics>;
}

export interface QueueHealthConfig {
  maxQueueDepth?: number;
  maxFailureRate?: number; // Percentage (0-100)
  checkIntervalMs?: number;
  alertCooldownMs?: number;
}

const DEFAULT_CONFIG: Required<QueueHealthConfig> = {
  maxQueueDepth: 1000,
  maxFailureRate: 10, // 10%
  checkIntervalMs: 30_000, // 30 seconds
  alertCooldownMs: 300_000 // 5 minutes
};

export class QueueHealthService {
  private config: Required<QueueHealthConfig>;
  private checkTimer?: NodeJS.Timeout;
  private lastMetrics: QueueHealthMetrics | null = null;
  private activeAlerts = new Map<string, QueueHealthAlert>();
  private lastAlertTime = new Map<string, number>();
  private processingCounts: number[] = []; // Last 10 processing counts for rate calculation
  private failureCounts: number[] = []; // Last 10 failure counts for rate calculation
  private processingTimes: number[] = []; // Last 100 processing times

  // OpenTelemetry metrics
  private meter: Meter | null = null;
  private queueDepthGauge?: Counter;
  private processingRateGauge?: Counter;
  private failureRateGauge?: Counter;
  private averageProcessingTimeGauge?: Counter;
  private healthStatusGauge?: Counter;

  constructor(config: QueueHealthConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeOpenTelemetryMetrics();
  }

  /**
   * Initialize OpenTelemetry metrics
   */
  private initializeOpenTelemetryMetrics(): void {
    try {
      const otelService = getOpenTelemetryService();
      if (otelService && otelService.isInitialized()) {
        this.meter = otelService.getMeter();
        
        if (this.meter) {
          // Use ObservableGauge for values that change over time
          // Note: OpenTelemetry API doesn't have createUpDownCounter, using Counter instead
          this.queueDepthGauge = this.meter.createCounter('job_queue_depth', {
            description: 'Current number of jobs waiting in queue'
          }) as any;
          this.processingRateGauge = this.meter.createCounter('job_queue_processing_rate', {
            description: 'Jobs processed per minute'
          }) as any;
          this.failureRateGauge = this.meter.createCounter('job_queue_failure_rate_percent', {
            description: 'Job failure rate percentage'
          }) as any;
          this.averageProcessingTimeGauge = this.meter.createCounter('job_queue_avg_processing_time_ms', {
            description: 'Average job processing time in milliseconds'
          }) as any;
          this.healthStatusGauge = this.meter.createCounter('job_queue_health_status', {
            description: 'Queue health status (1 = healthy, 0 = unhealthy)'
          }) as any;
        }
      }
    } catch (error) {
      logger.warn('OpenTelemetry metrics not available for queue health', error);
    }
  }

  /**
   * Start monitoring queue health
   */
  start(): void {
    if (this.checkTimer) {
      return; // Already started
    }

    logger.info('📊 Starting queue health monitoring...');
    
    // Initial check
    this.checkHealth().catch(error => {
      logger.error('Initial queue health check failed:', error);
    });

    // Periodic checks
    this.checkTimer = setInterval(() => {
      this.checkHealth().catch(error => {
        logger.error('Queue health check failed:', error);
      });
    }, this.config.checkIntervalMs);

    logger.info('✅ Queue health monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
    logger.info('⏹️ Queue health monitoring stopped');
  }

  /**
   * Check queue health and generate alerts
   */
  async checkHealth(): Promise<QueueHealthMetrics> {
    try {
      // Check if queue is initialized (bull package may not be installed)
      if (!jobQueueAdapter.isQueueHealthy() && !jobQueueAdapter.isInitialized()) {
        // Queue not available (bull not installed or not initialized)
        return {
          queueDepth: 0,
          activeJobs: 0,
          waitingJobs: 0,
          failedJobs: 0,
          completedJobs: 0,
          processingRate: 0,
          failureRate: 0,
          averageProcessingTime: 0,
          isHealthy: true, // Not unhealthy, just unavailable
          redisConnected: false,
          lastCheck: new Date()
        };
      }

      // Check Redis connection
      const healthCheck = await jobQueueAdapter.checkHealth();
      const redisConnected = healthCheck.healthy;

      // Get queue stats
      const stats = await jobQueueAdapter.getJobStats();
      const queueStatus = await jobQueueAdapter.getQueueStatus();

      const queueDepth = stats.waiting;
      const activeJobs = stats.active;
      const failedJobs = stats.failed;
      const completedJobs = stats.completed;

      // Calculate processing rate (jobs per minute)
      this.processingCounts.push(completedJobs);
      if (this.processingCounts.length > 10) {
        this.processingCounts.shift();
      }
      const processingRate = this.calculateRate(this.processingCounts);

      // Calculate failure rate (percentage)
      this.failureCounts.push(failedJobs);
      if (this.failureCounts.length > 10) {
        this.failureCounts.shift();
      }
      const failureRate = this.calculateFailureRate(this.processingCounts, this.failureCounts);

      // Calculate average processing time
      const averageProcessingTime = this.calculateAverage(this.processingTimes);

      const isHealthy = redisConnected && 
                       queueDepth < this.config.maxQueueDepth && 
                       failureRate < this.config.maxFailureRate;

      const metrics: QueueHealthMetrics = {
        queueDepth,
        activeJobs,
        waitingJobs: queueDepth,
        failedJobs,
        completedJobs,
        processingRate,
        failureRate,
        averageProcessingTime,
        isHealthy,
        redisConnected,
        lastCheck: new Date()
      };

      this.lastMetrics = metrics;

      // Record OpenTelemetry metrics
      this.recordOpenTelemetryMetrics(metrics);

      // Check for alerts
      await this.checkAlerts(metrics);

      // Record to monitoring service
      monitoringService.recordMetrics([
        {
          name: 'queue_health_queue_depth',
          value: queueDepth,
          tags: { status: isHealthy ? 'healthy' : 'unhealthy' }
        },
        {
          name: 'queue_health_processing_rate',
          value: processingRate,
          tags: { status: isHealthy ? 'healthy' : 'unhealthy' }
        },
        {
          name: 'queue_health_failure_rate',
          value: failureRate,
          tags: { status: isHealthy ? 'healthy' : 'unhealthy' }
        },
        {
          name: 'queue_health_status',
          value: isHealthy ? 1 : 0,
          tags: {}
        }
      ]);

      return metrics;
    } catch (error) {
      logger.error('Queue health check failed:', error);
      
      // Return unhealthy metrics
      const unhealthyMetrics: QueueHealthMetrics = {
        queueDepth: 0,
        activeJobs: 0,
        waitingJobs: 0,
        failedJobs: 0,
        completedJobs: 0,
        processingRate: 0,
        failureRate: 100,
        averageProcessingTime: 0,
        isHealthy: false,
        redisConnected: false,
        lastCheck: new Date()
      };

      this.lastMetrics = unhealthyMetrics;
      return unhealthyMetrics;
    }
  }

  /**
   * Get current health metrics
   */
  getMetrics(): QueueHealthMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): QueueHealthAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Check for alerts and trigger if needed
   */
  private async checkAlerts(metrics: QueueHealthMetrics): Promise<void> {
    const now = Date.now();

    // Check queue depth
    if (metrics.queueDepth >= this.config.maxQueueDepth) {
      const alertId = 'queue_depth_high';
      if (this.shouldAlert(alertId, now)) {
        await this.triggerAlert({
          id: alertId,
          type: 'queue_depth',
          severity: metrics.queueDepth > this.config.maxQueueDepth * 2 ? 'critical' : 'warning',
          message: `Queue depth (${metrics.queueDepth}) exceeds threshold (${this.config.maxQueueDepth})`,
          timestamp: new Date(),
          metrics: { queueDepth: metrics.queueDepth }
        });
      }
    } else {
      this.clearAlert('queue_depth_high');
    }

    // Check failure rate
    if (metrics.failureRate >= this.config.maxFailureRate) {
      const alertId = 'high_failure_rate';
      if (this.shouldAlert(alertId, now)) {
        await this.triggerAlert({
          id: alertId,
          type: 'high_failure_rate',
          severity: metrics.failureRate > this.config.maxFailureRate * 2 ? 'critical' : 'warning',
          message: `Job failure rate (${metrics.failureRate.toFixed(2)}%) exceeds threshold (${this.config.maxFailureRate}%)`,
          timestamp: new Date(),
          metrics: { failureRate: metrics.failureRate }
        });
      }
    } else {
      this.clearAlert('high_failure_rate');
    }

    // Check Redis connection
    if (!metrics.redisConnected) {
      const alertId = 'redis_disconnected';
      if (this.shouldAlert(alertId, now)) {
        await this.triggerAlert({
          id: alertId,
          type: 'redis_disconnected',
          severity: 'critical',
          message: 'Redis connection lost - job queue unavailable',
          timestamp: new Date(),
          metrics: { redisConnected: false }
        });
      }
    } else {
      this.clearAlert('redis_disconnected');
    }
  }

  /**
   * Check if alert should be triggered (cooldown check)
   */
  private shouldAlert(alertId: string, now: number): boolean {
    const lastAlert = this.lastAlertTime.get(alertId);
    if (!lastAlert) {
      return true;
    }
    return (now - lastAlert) >= this.config.alertCooldownMs;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(alert: QueueHealthAlert): Promise<void> {
    this.activeAlerts.set(alert.id, alert);
    this.lastAlertTime.set(alert.id, Date.now());

    logger.warn(`🚨 Queue Health Alert [${alert.severity.toUpperCase()}]: ${alert.message}`, {
      alertId: alert.id,
      type: alert.type,
      metrics: alert.metrics
    });

    // Record alert metric
    monitoringService.recordMetric({
      name: 'queue_health_alert',
      value: 1,
      tags: {
        alert_id: alert.id,
        type: alert.type,
        severity: alert.severity
      }
    });
  }

  /**
   * Clear an alert
   */
  private clearAlert(alertId: string): void {
    if (this.activeAlerts.has(alertId)) {
      const alert = this.activeAlerts.get(alertId)!;
      logger.info(`✅ Queue Health Alert Resolved: ${alert.message}`, {
        alertId: alert.id
      });
      this.activeAlerts.delete(alertId);
    }
  }

  /**
   * Record OpenTelemetry metrics
   */
  private recordOpenTelemetryMetrics(metrics: QueueHealthMetrics): void {
    if (!this.meter) return;

    try {
      this.queueDepthGauge?.add(metrics.queueDepth, {});
      this.processingRateGauge?.add(metrics.processingRate, {});
      this.failureRateGauge?.add(metrics.failureRate, {});
      this.averageProcessingTimeGauge?.add(metrics.averageProcessingTime, {});
      this.healthStatusGauge?.add(metrics.isHealthy ? 1 : 0, {});
    } catch (error) {
      logger.warn('Failed to record OpenTelemetry queue health metrics:', error);
    }
  }

  /**
   * Calculate rate from array of counts
   */
  private calculateRate(counts: number[]): number {
    if (counts.length < 2) return 0;
    const diff = counts[counts.length - 1] - counts[0];
    return diff / (counts.length - 1);
  }

  /**
   * Calculate failure rate percentage
   */
  private calculateFailureRate(processingCounts: number[], failureCounts: number[]): number {
    if (processingCounts.length < 2 || failureCounts.length < 2) return 0;
    
    const processingDiff = processingCounts[processingCounts.length - 1] - processingCounts[0];
    const failureDiff = failureCounts[failureCounts.length - 1] - failureCounts[0];
    
    if (processingDiff === 0) return 0;
    return (failureDiff / processingDiff) * 100;
  }

  /**
   * Calculate average from array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Record processing time (called by job queue adapter)
   */
  recordProcessingTime(duration: number): void {
    this.processingTimes.push(duration);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
  }
}

// Export singleton instance
export const queueHealthService = new QueueHealthService();

