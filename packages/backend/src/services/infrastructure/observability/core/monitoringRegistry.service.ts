/**
 * Monitoring and Alerting Service
 * 
 * Provides comprehensive monitoring, metrics collection, and alerting
 * capabilities for the application.
 * 
 * Now uses OpenTelemetry as the backend for metrics while maintaining
 * backward compatibility with the existing facade.
 */

import { CircuitBreakerStats, Alert, AlertRule, MetricData, SystemHealth } from '../utils/types';
import { getOpenTelemetryService } from './otel.service';
import { metrics, Counter, Histogram, Meter } from '@opentelemetry/api';
import { logger } from '../../../../utils/logger';

export class MonitoringService {
  // In-memory storage for backward compatibility (alerts, rules)
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private maxAlertHistory = 100; // Keep last 100 alerts (reduced from 1k for memory efficiency)

  // OpenTelemetry metrics
  private meter: Meter | null = null;
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  // Legacy in-memory metrics (for backward compatibility during migration)
  // Reduced from 10k to 1k to save memory - OpenTelemetry handles long-term storage
  private metrics: MetricData[] = [];
  private maxMetricsHistory = 1000; // Keep last 1k metrics (reduced from 10k for memory efficiency)
  private useOpenTelemetry = false;

  constructor() {
    this.initializeDefaultAlertRules();
    this.initializeOpenTelemetry();
    this.startAlertCleanup();
  }

  /**
   * Start periodic alert cleanup to prevent accumulation
   */
  private startAlertCleanup(): void {
    // Clean up old alerts every 5 minutes
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up old alerts that should have been resolved
   */
  private cleanupOldAlerts(): void {
    const now = Date.now();
    const alertsToResolve: string[] = [];

    // Auto-resolve alerts older than:
    // - Warning/low alerts: 5 minutes (these are usually transient)
    // - High severity: 15 minutes
    // - Critical: 30 minutes
    this.activeAlerts.forEach((alert, alertId) => {
      const age = now - alert.timestamp.getTime();
      const maxAge = 
        alert.severity === 'critical' ? 30 * 60 * 1000 : // 30 minutes
        alert.severity === 'high' ? 15 * 60 * 1000 : // 15 minutes
        5 * 60 * 1000; // 5 minutes for warning/low

      if (age > maxAge) {
        alertsToResolve.push(alertId);
      }
    });

    // Resolve old alerts
    alertsToResolve.forEach(alertId => {
      this.resolveAlert(alertId);
    });

    if (alertsToResolve.length > 0) {
      logger.debug(`Cleaned up ${alertsToResolve.length} expired alerts (${this.activeAlerts.size} remaining)`);
    }
  }

  /**
   * Initialize OpenTelemetry metrics
   */
  private initializeOpenTelemetry(): void {
    try {
      const otelService = getOpenTelemetryService();
      if (otelService && otelService.isInitialized()) {
        this.meter = otelService.getMeter();
        this.useOpenTelemetry = !!this.meter;
        
        if (this.useOpenTelemetry) {
          logger.info('✅ MonitoringService using OpenTelemetry backend');
        }
      }
    } catch (error) {
      logger.warn('⚠️ OpenTelemetry not available, using in-memory metrics');
      this.useOpenTelemetry = false;
    }
  }

  /**
   * Get or create a counter metric
   */
  private getCounter(name: string, description?: string): Counter {
    if (!this.meter) {
      throw new Error('OpenTelemetry meter not available');
    }

    if (!this.counters.has(name)) {
      const counter = this.meter.createCounter(name, {
        description: description || `Counter for ${name}`
      });
      this.counters.set(name, counter);
    }

    return this.counters.get(name)!;
  }

  /**
   * Get or create a histogram metric
   */
  private getHistogram(name: string, description?: string): Histogram {
    if (!this.meter) {
      throw new Error('OpenTelemetry meter not available');
    }

    if (!this.histograms.has(name)) {
      const histogram = this.meter.createHistogram(name, {
        description: description || `Histogram for ${name}`
      });
      this.histograms.set(name, histogram);
    }

    return this.histograms.get(name)!;
  }

  /**
   * Record a metric (facade - uses OpenTelemetry or in-memory)
   */
  recordMetric(metric: Omit<MetricData, 'timestamp'>): void {
    const metricData: MetricData = {
      ...metric,
      timestamp: new Date()
    };

    // Record to OpenTelemetry if available
    if (this.useOpenTelemetry && this.meter) {
      try {
        this.recordMetricToOpenTelemetry(metricData);
      } catch (error) {
        logger.warn('Failed to record metric to OpenTelemetry, falling back to in-memory:', error);
        this.recordMetricToMemory(metricData);
      }
    } else {
      // Fallback to in-memory storage
      this.recordMetricToMemory(metricData);
    }

    // Check alert rules (always)
    this.checkAlertRules(metricData);
  }

  /**
   * Record metric to OpenTelemetry
   */
  private recordMetricToOpenTelemetry(metric: MetricData): void {
    if (!this.meter) return;

    // Determine metric type based on name patterns
    if (metric.name.includes('_total') || metric.name.includes('_count')) {
      // Counter metric
      const counter = this.getCounter(metric.name, metric.unit);
      counter.add(metric.value, metric.tags || {});
    } else if (metric.name.includes('_duration') || metric.name.includes('_time') || metric.unit === 'ms' || metric.unit === 'seconds') {
      // Histogram metric (for durations/times)
      const histogram = this.getHistogram(metric.name, metric.unit);
      histogram.record(metric.value, metric.tags || {});
    } else {
      // Default to counter
      const counter = this.getCounter(metric.name, metric.unit);
      counter.add(metric.value, metric.tags || {});
    }
  }

  /**
   * Record metric to in-memory storage (backward compatibility)
   */
  private recordMetricToMemory(metric: MetricData): void {
    this.metrics.push(metric);

    // Trim metrics history if needed
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Record multiple metrics at once
   */
  recordMetrics(metrics: Omit<MetricData, 'timestamp'>[]): void {
    metrics.forEach(metric => this.recordMetric(metric));
  }

  /**
   * Get metrics for a specific time range (from in-memory storage)
   * Note: OpenTelemetry metrics should be queried via Prometheus/Grafana
   */
  getMetrics(
    name?: string,
    startTime?: Date,
    endTime?: Date,
    limit?: number
  ): MetricData[] {
    // Only return in-memory metrics (for backward compatibility)
    // For OpenTelemetry metrics, use Prometheus queries
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (startTime) {
      filtered = filtered.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(m => m.timestamp <= endTime);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Get aggregated metrics (average, min, max, sum)
   * Note: For OpenTelemetry metrics, use Prometheus aggregation functions
   */
  getAggregatedMetrics(
    name: string,
    startTime?: Date,
    endTime?: Date,
    aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count' = 'avg'
  ): number {
    const metrics = this.getMetrics(name, startTime, endTime);
    
    if (metrics.length === 0) return 0;

    switch (aggregation) {
      case 'avg':
        return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      case 'min':
        return Math.min(...metrics.map(m => m.value));
      case 'max':
        return Math.max(...metrics.map(m => m.value));
      case 'sum':
        return metrics.reduce((sum, m) => sum + m.value, 0);
      case 'count':
        return metrics.length;
      default:
        return 0;
    }
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const history = [...this.alertHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = new Date();
      this.activeAlerts.delete(alertId);
      this.alertHistory.push(alert);
      
      // Trim alert history if needed
      if (this.alertHistory.length > this.maxAlertHistory) {
        this.alertHistory = this.alertHistory.slice(-this.maxAlertHistory);
      }
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const now = new Date();
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

    // Get recent metrics (from in-memory or OpenTelemetry)
    const responseTime = this.getAggregatedMetrics('response_time', last5Minutes, now, 'avg');
    const errorRate = this.getAggregatedMetrics('error_rate', last5Minutes, now, 'avg');
    
    // Get system metrics
    const cpu = this.getAggregatedMetrics('cpu_usage', last5Minutes, now, 'avg');
    const memory = this.getAggregatedMetrics('memory_usage', last5Minutes, now, 'avg');
    const disk = this.getAggregatedMetrics('disk_usage', last5Minutes, now, 'avg');

    // Determine overall health
    // Note: Memory usage alone shouldn't mark system as unhealthy if it's stable
    // High memory usage (90%+) is common in Node.js apps and GC handles it
    // Also: Alert count alone shouldn't mark system as unhealthy - only recent critical alerts matter
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const healthIssues: string[] = [];
    const healthRecommendations: string[] = [];
    
    // Get recent critical alerts (last 5 minutes) - these are the ones that matter
    const recentCriticalAlerts = this.getActiveAlerts().filter(alert => {
      const age = now.getTime() - alert.timestamp.getTime();
      return alert.severity === 'critical' && age < 5 * 60 * 1000; // Last 5 minutes
    });
    
    // Get recent high severity alerts (last 15 minutes)
    const recentHighAlerts = this.getActiveAlerts().filter(alert => {
      const age = now.getTime() - alert.timestamp.getTime();
      return alert.severity === 'high' && age < 15 * 60 * 1000;
    });
    
    // Analyze what's causing issues
    if (errorRate > 0.1) {
      healthIssues.push(`High error rate: ${(errorRate * 100).toFixed(2)}% (threshold: 10%)`);
      healthRecommendations.push('Check application logs for errors, review recent deployments, verify database connectivity');
    }
    
    if (responseTime > 5000) {
      healthIssues.push(`Very slow response time: ${responseTime.toFixed(0)}ms (threshold: 5000ms)`);
      healthRecommendations.push('Check database query performance, review slow endpoints, consider caching');
    }
    
    if (cpu > 90) {
      healthIssues.push(`High CPU usage: ${cpu.toFixed(1)}% (threshold: 90%)`);
      healthRecommendations.push('Check for CPU-intensive operations, review background jobs, consider scaling');
    }
    
    if (memory > 98) {
      healthIssues.push(`Critical memory usage: ${memory.toFixed(1)}% (threshold: 98%)`);
      healthRecommendations.push('Check for memory leaks, review heap dumps, consider restarting the application');
    } else if (memory > 95) {
      healthIssues.push(`High memory usage: ${memory.toFixed(1)}% (threshold: 95%)`);
      healthRecommendations.push('Monitor memory trends - this may be normal for Node.js apps with GC');
    }
    
    if (recentCriticalAlerts.length > 0) {
      const alertTypes = new Set(recentCriticalAlerts.map(a => a.ruleId || a.message.split(':')[0]));
      healthIssues.push(`Recent critical alerts: ${recentCriticalAlerts.length} (types: ${Array.from(alertTypes).join(', ')})`);
      healthRecommendations.push('Review recent critical alerts in logs, check alert details for specific issues');
    }
    
    // Unhealthy: critical issues (errors, very slow response, CPU maxed out, memory > 98%, OR recent critical alerts)
    if (errorRate > 0.1 || responseTime > 5000 || cpu > 90 || memory > 98 || recentCriticalAlerts.length > 0) {
      status = 'unhealthy';
    } 
    // Degraded: warning conditions (some errors, slow response, high CPU, or memory > 95%)
    else if (errorRate > 0.05 || responseTime > 2000 || cpu > 70 || memory > 95 || recentHighAlerts.length > 5) {
      status = 'degraded';
    }

    // Get alert breakdown for diagnostics
    const allAlerts = this.getActiveAlerts();
    const alertBreakdown = {
      total: allAlerts.length,
      bySeverity: {
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        high: allAlerts.filter(a => a.severity === 'high').length,
        warning: allAlerts.filter(a => a.severity === 'low' || a.severity === 'medium' || !a.severity).length
      },
      byAge: {
        recent: allAlerts.filter(a => (now.getTime() - a.timestamp.getTime()) < 5 * 60 * 1000).length,
        old: allAlerts.filter(a => (now.getTime() - a.timestamp.getTime()) >= 5 * 60 * 1000).length
      },
      recentCritical: recentCriticalAlerts.length,
      recentHigh: recentHighAlerts.length
    };

    return {
      status,
      timestamp: now,
      services: {
        database: 'up', // This would be checked against actual service health
        cache: 'up',
        storage: 'up',
        external: 'up'
      },
      metrics: {
        cpu,
        memory,
        disk,
        responseTime,
        errorRate
      },
      alerts: this.getActiveAlerts(),
      // Add diagnostic information
      diagnostics: {
        healthIssues: healthIssues.length > 0 ? healthIssues : ['No critical issues detected'],
        recommendations: healthRecommendations.length > 0 ? healthRecommendations : ['System is operating normally'],
        alertBreakdown,
        statusReason: healthIssues.length > 0 
          ? healthIssues.join('; ') 
          : status === 'degraded' 
            ? 'Minor performance degradation detected'
            : 'All systems operating normally'
      }
    };
  }

  /**
   * Check alert rules against a metric
   */
  private checkAlertRules(metric: MetricData): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled || rule.metric !== metric.name) return;

      const shouldTrigger = this.evaluateCondition(metric.value, rule.condition, rule.threshold);
      
      if (shouldTrigger) {
        const alertId = `${rule.id}-${metric.timestamp.getTime()}`;
        
        // Check if alert is already active
        if (!this.activeAlerts.has(alertId)) {
          const alert: Alert = {
            id: alertId,
            ruleId: rule.id,
            message: `${rule.name}: ${metric.name} ${rule.condition} ${rule.threshold} (current: ${metric.value})`,
            severity: rule.severity,
            timestamp: metric.timestamp,
            metadata: {
              metricValue: metric.value,
              threshold: rule.threshold,
              condition: rule.condition,
              tags: metric.tags
            }
          };

          this.activeAlerts.set(alertId, alert);
        }
      }
    });
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'error_rate',
        condition: 'gt',
        threshold: 0.1,
        duration: 300000, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        metric: 'response_time',
        condition: 'gt',
        threshold: 5000,
        duration: 300000, // 5 minutes
        severity: 'medium',
        enabled: true
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        metric: 'cpu_usage',
        condition: 'gt',
        threshold: 90,
        duration: 300000, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        metric: 'memory_usage',
        condition: 'gt',
        threshold: 90,
        duration: 300000, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'low-disk-space',
        name: 'Low Disk Space',
        metric: 'disk_usage',
        condition: 'gt',
        threshold: 85,
        duration: 600000, // 10 minutes
        severity: 'medium',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.recordMetrics([
      {
        name: 'memory_usage',
        value: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        unit: 'percent',
        tags: { type: 'heap' }
      },
      {
        name: 'memory_rss',
        value: memUsage.rss / 1024 / 1024, // MB
        unit: 'MB',
        tags: { type: 'rss' }
      },
      {
        name: 'cpu_usage',
        value: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        unit: 'seconds',
        tags: { type: 'process' }
      }
    ]);
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpMetrics(method: string, path: string, statusCode: number, duration: number): void {
    this.recordMetrics([
      {
        name: 'http_requests_total',
        value: 1,
        tags: { method, path, status: statusCode.toString() }
      },
      {
        name: 'http_request_duration',
        value: duration,
        unit: 'ms',
        tags: { method, path, status: statusCode.toString() }
      },
      {
        name: 'response_time',
        value: duration,
        unit: 'ms'
      }
    ]);

    // Record error rate
    if (statusCode >= 400) {
      this.recordMetric({
        name: 'error_rate',
        value: 1,
        tags: { method, path, status: statusCode.toString() }
      });
    }
  }

  /**
   * Record circuit breaker metrics
   */
  recordCircuitBreakerMetrics(stats: Record<string, CircuitBreakerStats>): void {
    Object.entries(stats).forEach(([name, stat]) => {
      this.recordMetrics([
        {
          name: 'circuit_breaker_state',
          value: stat.state === 'CLOSED' ? 0 : stat.state === 'HALF_OPEN' ? 1 : 2,
          tags: { circuit: name, state: stat.state }
        },
        {
          name: 'circuit_breaker_failures',
          value: stat.totalFailures,
          tags: { circuit: name }
        },
        {
          name: 'circuit_breaker_successes',
          value: stat.totalSuccesses,
          tags: { circuit: name }
        }
      ]);
    });
  }

  /**
   * Get metrics (for backward compatibility)
   * Note: Returns empty array if using OpenTelemetry - use Prometheus queries instead
   */
  getMetricsData(): MetricData[] {
    return this.useOpenTelemetry ? [] : this.metrics;
  }

  /**
   * Check if using OpenTelemetry backend
   */
  isUsingOpenTelemetry(): boolean {
    return this.useOpenTelemetry;
  }
}

// Global monitoring service instance
export const monitoringService = new MonitoringService();
