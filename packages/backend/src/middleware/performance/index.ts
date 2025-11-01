/**
 * Performance & Monitoring Middleware Module
 * 
 * Exports performance optimization and metrics tracking middleware
 */

// Performance optimization
export {
  performanceMiddleware,
  cacheMiddleware,
  compressionMiddleware,
  requestSizeMiddleware,
  responseTimeMiddleware,
  queryOptimizationMiddleware,
  memoryMonitoringMiddleware,
  circuitBreakerMiddleware,
  deduplicationMiddleware,
  healthCheckMiddleware,
  type PerformanceRequest
} from './performance.middleware';

// Metrics tracking
export {
  metricsMiddleware,
  trackManufacturerAction,
  trackBrandConnection,
  metricsHandler,
  getMetricsJSON,
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  httpErrorsTotal,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  manufacturerActionsTotal,
  brandConnectionsTotal
} from './metrics.middleware';

