/**
 * Memory Leak Prevention and Monitoring Service
 *
 * Provides comprehensive memory monitoring, leak detection, and automatic
 * garbage collection hints to prevent memory-related performance issues.
 */

import { logger } from '../../../../utils/logger';
import { monitoringService } from '../core/monitoringRegistry.service';
import type { MemoryStats, MemoryThresholds, MemoryAlert, LeakDetection } from '../utils/types';

/**
 * Memory monitoring and leak prevention service
 */
export class MemoryMonitorService {
  private memoryHistory: MemoryStats[] = [];
  private alerts: MemoryAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private gcWarningLogged = false;

  private readonly MAX_HISTORY_SIZE = 60; // Keep 60 samples (5 minutes if sampling every 5 seconds)
  private readonly LEAK_DETECTION_SAMPLES = 20; // Number of samples to analyze for leak detection

  private thresholds: MemoryThresholds = {
    warning: 512,      // 512 MB warning
    critical: 1024,    // 1 GB critical
    maxHeapUsage: 95,  // 95% max heap usage (adjusted for production - 85% was too sensitive)
    gcHint: 256        // GC hint at 256 MB
  };

  private readonly gcSupported = typeof global.gc === 'function';

  constructor() {
    this.setupProcessHandlers();
    this.startMonitoring();
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      logger.warn('Memory monitoring is already running');
      return;
    }

    logger.info('🧠 Starting memory monitoring...', {
      interval: intervalMs,
      thresholds: this.thresholds
    });

    this.isMonitoring = true;
    this.clearMonitoringTimers();

    // Main monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.collectMemoryStats();
    }, intervalMs);

    // Periodic garbage collection hints
    if (this.gcSupported) {
      this.gcInterval = setInterval(() => {
        this.checkGarbageCollection();
      }, 30000); // Every 30 seconds
    } else if (!this.gcWarningLogged) {
      this.gcWarningLogged = true;
      logger.info('Manual GC hints disabled (start Node with --expose-gc to enable)');
    }

    // Periodic cleanup of old data
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('✅ Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('⏹️ Stopping memory monitoring...');

    this.clearMonitoringTimers();

    this.isMonitoring = false;
    logger.info('✅ Memory monitoring stopped');
  }

  private clearMonitoringTimers(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Collect current memory statistics
   */
  private collectMemoryStats(): void {
    try {
      const memUsage = process.memoryUsage();
      const timestamp = Date.now();

      const stats: MemoryStats = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
        timestamp
      };

      // Log heap size on first collection to help diagnose memory issues
      if (this.memoryHistory.length === 0) {
        logger.info('📊 Initial memory state:', {
          heapTotal: `${stats.heapTotal}MB`,
          heapUsed: `${stats.heapUsed}MB`,
          heapUsagePercent: `${((stats.heapUsed / stats.heapTotal) * 100).toFixed(1)}%`,
          rss: `${stats.rss}MB`,
          external: `${stats.external}MB`,
          note: stats.heapTotal < 200 ? 'Small heap detected - NODE_OPTIONS may not be set. For Standard plan (2GB), use NODE_OPTIONS="--max-old-space-size=1536"' : stats.heapTotal < 500 ? 'Heap size below recommended. For Standard plan (2GB), use NODE_OPTIONS="--max-old-space-size=1536"' : 'Heap size normal'
        });
      }

      // Add to history
      this.memoryHistory.push(stats);

      // Keep only recent history
      if (this.memoryHistory.length > this.MAX_HISTORY_SIZE) {
        this.memoryHistory = this.memoryHistory.slice(-this.MAX_HISTORY_SIZE);
      }

      // Check thresholds
      this.checkThresholds(stats);

      // Check for memory leaks
      this.checkForLeaks();

      // Record metrics
      this.recordMetrics(stats);
    } catch (error) {
      this.handleMonitoringError(error, 'collectMemoryStats');
    }
  }

  /**
   * Check memory thresholds and generate alerts
   */
  private checkThresholds(stats: MemoryStats): void {
    const heapUsagePercent = (stats.heapUsed / stats.heapTotal) * 100;

    // Auto-resolve alerts when conditions improve
    this.resolveAlertsWhenImproved(stats, heapUsagePercent);

    // Critical threshold check
    if (stats.heapUsed > this.thresholds.critical) {
      this.createAlert('critical', `Critical memory usage: ${stats.heapUsed}MB`, stats.heapUsed, this.thresholds.critical,
        'Consider restarting the application or investigating memory leaks');
    }
    // Warning threshold check
    else if (stats.heapUsed > this.thresholds.warning) {
      this.createAlert('warning', `High memory usage: ${stats.heapUsed}MB`, stats.heapUsed, this.thresholds.warning,
        'Monitor application closely and consider optimization');
    }

    // Heap usage percentage check (only alert if above 95%)
    if (heapUsagePercent > this.thresholds.maxHeapUsage) {
      this.createAlert('warning', `High heap usage: ${heapUsagePercent.toFixed(1)}%`, heapUsagePercent, this.thresholds.maxHeapUsage,
        'Heap is nearly full, garbage collection may be frequent');
    }
  }

  /**
   * Auto-resolve alerts when memory conditions improve
   */
  private resolveAlertsWhenImproved(stats: MemoryStats, heapUsagePercent: number): void {
    // Resolve alerts that are no longer relevant
    const alertsToResolve: string[] = [];
    
    this.alerts.forEach((alert, index) => {
      // Resolve heap usage alerts if usage dropped below threshold
      if (alert.message.includes('heap usage') && heapUsagePercent <= this.thresholds.maxHeapUsage - 5) {
        alertsToResolve.push(`heap_usage_${index}`);
      }
      // Resolve memory usage alerts if usage dropped below threshold
      else if (alert.message.includes('memory usage') && !alert.message.includes('heap')) {
        if (stats.heapUsed <= this.thresholds.warning) {
          alertsToResolve.push(`memory_usage_${index}`);
        }
      }
    });

    // Remove resolved alerts (keep only unresolved ones)
    if (alertsToResolve.length > 0) {
      const originalLength = this.alerts.length;
      this.alerts = this.alerts.filter((_, index) => !alertsToResolve.includes(`heap_usage_${index}`) && !alertsToResolve.includes(`memory_usage_${index}`));
      
      if (this.alerts.length < originalLength) {
        logger.debug(`Auto-resolved ${originalLength - this.alerts.length} memory alerts as conditions improved`);
      }
    }
  }

  /**
   * Check for potential memory leaks
   */
  private checkForLeaks(): void {
    if (this.memoryHistory.length < this.LEAK_DETECTION_SAMPLES) {
      return;
    }

    const recentSamples = this.memoryHistory.slice(-this.LEAK_DETECTION_SAMPLES);
    const oldestSample = recentSamples[0];
    const newestSample = recentSamples[recentSamples.length - 1];

    const durationMinutes = (newestSample.timestamp - oldestSample.timestamp) / (1000 * 60);
    const memoryGrowth = newestSample.heapUsed - oldestSample.heapUsed;
    const growthRate = memoryGrowth / durationMinutes; // MB per minute

    // Detect leak if consistent growth over threshold
    const leakThreshold = 5; // 5 MB per minute growth
    if (growthRate > leakThreshold && this.isConsistentGrowth(recentSamples)) {
      this.createAlert('leak_detected',
        `Potential memory leak detected: ${growthRate.toFixed(2)} MB/min growth`,
        growthRate, leakThreshold,
        'Investigate recent code changes, check for unclosed resources, or analyze heap dumps');

      // Force garbage collection
      this.forceGarbageCollection('leak_detected');
    }
  }

  /**
   * Check if memory growth is consistent (not just temporary spikes)
   */
  private isConsistentGrowth(samples: MemoryStats[]): boolean {
    let increasingCount = 0;

    for (let i = 1; i < samples.length; i++) {
      if (samples[i].heapUsed > samples[i - 1].heapUsed) {
        increasingCount++;
      }
    }

    // Consider it consistent if 70% of samples show increase
    return (increasingCount / (samples.length - 1)) > 0.7;
  }

  /**
   * Check if garbage collection should be hinted
   */
  private checkGarbageCollection(): void {
    if (!this.gcSupported || this.memoryHistory.length === 0) return;

    const latest = this.memoryHistory[this.memoryHistory.length - 1];

    // Hint GC if memory usage is above threshold
    if (latest.heapUsed > this.thresholds.gcHint) {
      this.forceGarbageCollection('threshold_exceeded');
    }
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(reason: string): void {
    if (this.gcSupported && global.gc && typeof global.gc === 'function') {
      const beforeGC = process.memoryUsage();

      try {
        global.gc();

        const afterGC = process.memoryUsage();
        const freed = Math.round((beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024);

        logger.info('🗑️ Garbage collection completed', {
          reason,
          freedMB: freed,
          beforeMB: Math.round(beforeGC.heapUsed / 1024 / 1024),
          afterMB: Math.round(afterGC.heapUsed / 1024 / 1024)
        });

        monitoringService.recordMetric({
          name: 'memory_gc_triggered',
          value: 1,
          tags: { reason, freed_mb: freed.toString() }
        });

      } catch (error) {
        // Sanitize error message for security
        logger.error('Failed to trigger garbage collection:', {
          message: 'GC trigger failed',
          timestamp: new Date().toISOString()
        });
      }
    } else if (!this.gcWarningLogged) {
      this.gcWarningLogged = true;
      logger.info('Manual GC hints are disabled because global.gc is unavailable (start Node with --expose-gc to enable).');
    }
  }

  /**
   * Create and store memory alert
   */
  private createAlert(level: MemoryAlert['level'], message: string, currentUsage: number, threshold: number, suggestion?: string): void {
    // Prevent duplicate alerts (same level and similar usage)
    const recentAlert = this.alerts.find(alert =>
      alert.level === level &&
      Math.abs(alert.currentUsage - currentUsage) < 10 &&
      Date.now() - alert.timestamp.getTime() < 60000 // Within 1 minute
    );

    if (recentAlert) {
      return; // Don't create duplicate alert
    }

    const alert: MemoryAlert = {
      level,
      message,
      currentUsage,
      threshold,
      timestamp: new Date(),
      suggestion
    };

    this.alerts.push(alert);

    // Log alert
    const logLevel = level === 'critical' ? 'error' : level === 'leak_detected' ? 'error' : 'warn';
    logger[logLevel](`Memory Alert [${level.toUpperCase()}]: ${message}`, {
      currentUsage,
      threshold,
      suggestion
    });

    // Record alert metric
    monitoringService.recordMetric({
      name: 'memory_alert',
      value: 1,
      tags: {
        level,
        current_usage: currentUsage.toString(),
        threshold: threshold.toString()
      }
    });

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Record memory metrics for monitoring
   */
  private recordMetrics(stats: MemoryStats): void {
    try {
      const metrics = [
        { name: 'memory_rss', value: stats.rss },
        { name: 'memory_heap_total', value: stats.heapTotal },
        { name: 'memory_heap_used', value: stats.heapUsed },
        { name: 'memory_external', value: stats.external },
        { name: 'memory_array_buffers', value: stats.arrayBuffers }
      ];

      metrics.forEach(metric => {
        monitoringService.recordMetric({
          name: metric.name,
          value: metric.value,
          tags: {}
        });
      });

      // Calculate and record heap usage percentage
      const heapUsagePercent = (stats.heapUsed / stats.heapTotal) * 100;
      monitoringService.recordMetric({
        name: 'memory_heap_usage_percent',
        value: heapUsagePercent,
        tags: {}
      });
    } catch (error) {
      this.handleMonitoringError(error, 'recordMetrics');
    }
  }

  /**
   * Setup process handlers for memory events
   */
  private setupProcessHandlers(): void {
    // Handle low memory warnings
    process.on('warning', (warning) => {
      if (warning.name === 'DeprecationWarning' && warning.message.includes('memory')) {
        logger.warn('Memory-related warning:', { message: warning.message });
      }
    });

    // Handle uncaught exceptions that might cause memory leaks
    process.on('uncaughtException', (error) => {
      // Sanitize error before logging to prevent information disclosure
      const sanitizedError = {
        message: 'Uncaught exception detected',
        timestamp: new Date().toISOString(),
        type: error?.name || 'UnknownError',
        errorMessage: error && typeof error === 'object' && 'message' in error
          ? String((error as Error).message).slice(0, 200)
          : undefined
      };
      logger.error('Uncaught exception (potential memory leak source):', sanitizedError);

      // Force GC after uncaught exception
      setTimeout(() => {
        this.forceGarbageCollection('uncaught_exception');
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      // Sanitize rejection reason to prevent information disclosure
      const sanitizedReason = {
        message: 'Unhandled promise rejection detected',
        timestamp: new Date().toISOString(),
        type: reason instanceof Error ? reason.name : typeof reason
      };
      logger.error('Unhandled promise rejection (potential memory leak source):', sanitizedReason);
    });

    // Handle SIGTERM and SIGINT for graceful shutdown
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, cleaning up memory monitoring...`);
        this.stopMonitoring();
      });
    });
  }

  /**
   * Clean up old data to prevent memory accumulation
   */
  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    // Clean old alerts (keep only alerts from last hour)
    // Also auto-expire alerts that are older than 5 minutes (conditions likely changed)
    const beforeCleanup = this.alerts.length;
    this.alerts = this.alerts.filter(alert => {
      const alertAge = Date.now() - alert.timestamp.getTime();
      // Keep recent alerts (< 5 minutes) or important alerts (< 1 hour)
      return alertAge < (alert.level === 'critical' || alert.level === 'leak_detected' ? 60 * 60 * 1000 : 5 * 60 * 1000);
    });
    
    if (this.alerts.length < beforeCleanup) {
      logger.debug(`Cleaned up ${beforeCleanup - this.alerts.length} expired memory alerts`);
    }

    // Memory history is already limited by MAX_HISTORY_SIZE
    logger.debug('Memory monitoring data cleanup completed', {
      alertsRemaining: this.alerts.length,
      historySize: this.memoryHistory.length
    });
  }

  /**
   * Get current memory statistics
   */
  getCurrentStats(): MemoryStats | null {
    return this.memoryHistory.length > 0 ? this.memoryHistory[this.memoryHistory.length - 1] : null;
  }

  /**
   * Get memory history
   */
  getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 10): MemoryAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get memory leak detection results
   */
  getLeakDetection(): LeakDetection {
    if (this.memoryHistory.length < this.LEAK_DETECTION_SAMPLES) {
      return {
        isLeakDetected: false,
        growthRate: 0,
        samples: [],
        duration: 0
      };
    }

    const samples = this.memoryHistory.slice(-this.LEAK_DETECTION_SAMPLES);
    const oldestSample = samples[0];
    const newestSample = samples[samples.length - 1];

    const durationMinutes = (newestSample.timestamp - oldestSample.timestamp) / (1000 * 60);
    const memoryGrowth = newestSample.heapUsed - oldestSample.heapUsed;
    const growthRate = memoryGrowth / durationMinutes;

    return {
      isLeakDetected: growthRate > 5 && this.isConsistentGrowth(samples),
      growthRate,
      samples,
      duration: durationMinutes
    };
  }

  /**
   * Update memory thresholds
   */
  updateThresholds(newThresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Memory thresholds updated', this.thresholds);
  }

  /**
   * Get comprehensive memory report
   */
  getMemoryReport(): {
    current: MemoryStats | null;
    thresholds: MemoryThresholds;
    recentAlerts: MemoryAlert[];
    leakDetection: LeakDetection;
    isMonitoring: boolean;
    recommendations: string[];
  } {
    const current = this.getCurrentStats();
    const leakDetection = this.getLeakDetection();
    const recentAlerts = this.getAlerts(5);

    const recommendations: string[] = [];

    if (current) {
      if (current.heapUsed > this.thresholds.warning) {
        recommendations.push('Memory usage is high. Consider optimizing data structures or implementing pagination.');
      }

      const heapUsagePercent = (current.heapUsed / current.heapTotal) * 100;
      if (heapUsagePercent > 80) {
        recommendations.push('Heap usage is high. Consider increasing heap size or optimizing memory allocation.');
      }

      if (leakDetection.isLeakDetected) {
        recommendations.push('Potential memory leak detected. Analyze heap dumps and check for unclosed resources.');
      }

      if (current.external > 100) {
        recommendations.push('High external memory usage detected. Check for large buffers or external resources.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears normal. Continue monitoring.');
    }

    return {
      current,
      thresholds: this.thresholds,
      recentAlerts,
      leakDetection,
      isMonitoring: this.isMonitoring,
      recommendations
    };
  }

  private handleMonitoringError(error: unknown, context: string): void {
    const sanitizedError = {
      message: 'Memory monitor operation failed',
      context,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message.slice(0, 200) : undefined,
      timestamp: new Date().toISOString()
    };
    logger.error('Memory monitor error:', sanitizedError);
  }
}

// Singleton instance
export const memoryMonitorService = new MemoryMonitorService();

/**
 * Utility functions for memory management
 */

/**
 * Monitor a function's memory usage
 */
export async function monitorFunctionMemory<T>(
  fn: () => Promise<T> | T,
  fnName: string = 'anonymous'
): Promise<{ result: T; memoryDelta: number; duration: number }> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const result = await fn();

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = Math.round((endMemory - startMemory) / 1024 / 1024);
    const duration = Number(endTime - startTime);

    logger.debug(`Function memory usage: ${fnName}`, {
      memoryDelta: `${memoryDelta}MB`,
      duration: Number(duration)
    });

    // Record metrics
    monitoringService.recordMetric({
      name: 'function_memory_delta',
      value: Number(memoryDelta),
      tags: { function: fnName }
    });

    return { result, memoryDelta, duration };

  } catch (error) {
    // Sanitize error for security
    const sanitizedError = {
      message: 'Function memory monitoring failed',
      functionName: fnName,
      timestamp: new Date().toISOString()
    };
    logger.error('Function memory monitoring failed:', sanitizedError);
    throw new Error(`Memory monitoring failed for function: ${fnName}`);
  }
}

/**
 * Create a memory-safe timeout that clears itself
 */
export function createMemorySafeTimeout(
  callback: () => void,
  delay: number,
  name?: string
): NodeJS.Timeout {
  const timeout = setTimeout(() => {
    try {
      callback();
    } catch (error) {
      // Sanitize timeout error
      const sanitizedError = {
        message: 'Memory-safe timeout error',
        timeoutName: name || 'unnamed',
        timestamp: new Date().toISOString()
      };
      logger.error('Memory-safe timeout error:', sanitizedError);
    }
  }, delay);

  // Auto-clear after execution to prevent memory leaks
  const originalClearTimeout = clearTimeout;
  (timeout as any).__cleared = false;

  const safeClearTimeout = () => {
    if (!(timeout as any).__cleared) {
      originalClearTimeout(timeout);
      (timeout as any).__cleared = true;
    }
  };

  // Override the timeout's clear method
  (timeout as any).clear = safeClearTimeout;

  return timeout;
}
