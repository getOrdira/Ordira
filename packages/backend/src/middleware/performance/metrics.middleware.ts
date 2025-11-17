// src/middleware/performance/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import client from 'prom-client';

// Initialize default metrics collection
client.collectDefaultMetrics({
  prefix: 'manufacturer_api_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Create a Registry for custom metrics
const register = new client.Registry();
client.collectDefaultMetrics({ 
  register,
  prefix: 'manufacturer_api_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
})

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'user_type'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// HTTP request counter
export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'user_type'] as const,
  registers: [register]
});

// Active connections gauge
export const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register]
});

// Error rate counter
export const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'] as const,
  registers: [register]
});

// Request size histogram
export const httpRequestSizeBytes = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'] as const,
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// Response size histogram
export const httpResponseSizeBytes = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// Business metrics
export const manufacturerActionsTotal = new client.Counter({
  name: 'manufacturer_actions_total',
  help: 'Total number of manufacturer actions',
  labelNames: ['action_type', 'manufacturer_id'] as const,
  registers: [register]
});

export const brandConnectionsTotal = new client.Counter({
  name: 'brand_connections_total',
  help: 'Total number of brand connections',
  labelNames: ['connection_type'] as const,
  registers: [register]
});

/**
 * Enhanced metrics middleware that tracks comprehensive HTTP and business metrics
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = process.hrtime.bigint();
  
  // Track active connections
  activeConnections.inc();
  
  // Get request size
  const contentLength = req.get('content-length');
  const requestSize = parseInt(Array.isArray(contentLength) ? contentLength[0] : contentLength || '0', 10);
  
  // Determine user type for labeling
  const getUserType = (): string => {
    if (req.path.includes('/manufacturer/')) return 'manufacturer';
    if (req.path.includes('/brand/') || req.path.includes('/business/')) return 'brand';
    return 'anonymous';
  };

  const userType = getUserType();
  const method = req.method;
  const originalUrl = req.originalUrl;
  
  // Get clean route path (without query params and IDs)
  const getRoutePath = (): string => {
    let route = req.route?.path || req.path;
    
    // Remove query parameters
    if (route.includes('?')) {
      route = route.split('?')[0];
    }
    
    // Replace dynamic segments with placeholders for better grouping
    route = route
      .replace(/\/[0-9a-f]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid'); // UUIDs
    
    return route;
  };

  const routePath = getRoutePath();

  // Track request size
  if (requestSize > 0) {
    httpRequestSizeBytes
      .labels({ method, route: routePath })
      .observe(requestSize);
  }

  // Set up response tracking
  const originalSend = res.send;
  let responseSize = 0;

  res.send = function(data: any) {
    if (data) {
      responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    }
    return originalSend.call(this, data);
  };

  // Track when response finishes
  res.on('finish', () => {
    try {
      // Calculate duration
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e9; // Convert to seconds
      
      const statusCode = res.statusCode.toString();
      const labels = {
        method,
        route: routePath,
        status_code: statusCode,
        user_type: userType
      };

      // Record metrics
      httpRequestDuration.labels(labels).observe(duration);
      httpRequestTotal.labels(labels).inc();
      
      // Track response size
      if (responseSize > 0) {
        httpResponseSizeBytes
          .labels({ method, route: routePath, status_code: statusCode })
          .observe(responseSize);
      }

      // Track errors
      if (res.statusCode >= 400) {
        const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
        httpErrorsTotal
          .labels({ method, route: routePath, status_code: statusCode, error_type: errorType })
          .inc();
      }

      // Decrement active connections
      activeConnections.dec();
      
    } catch (error) {
      logger.error('Error recording metrics:', error);
      activeConnections.dec(); // Ensure we always decrement
    }
  });

  // Handle connection close/abort
  res.on('close', () => {
    if (!res.finished) {
      activeConnections.dec();
    }
  });

  next();
}

/**
 * Middleware to track specific manufacturer actions
 */
export function trackManufacturerAction(actionType: string) {
  return (req: any, res: Response, next: NextFunction): void => {
    const manufacturerId = req.userId || req.manufacturer?.id || 'unknown';
    
    manufacturerActionsTotal
      .labels({ action_type: actionType, manufacturer_id: manufacturerId })
      .inc();
    
    next();
  };
}

/**
 * Middleware to track brand connections
 */
export function trackBrandConnection(connectionType: 'created' | 'accepted' | 'declined' | 'cancelled') {
  return (req: Request, res: Response, next: NextFunction): void => {
    brandConnectionsTotal
      .labels({ connection_type: connectionType })
      .inc();
    
    next();
  };
}

/**
 * Express handler to expose metrics endpoint
 */
export async function metricsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
}

/**
 * Get current metrics as JSON (useful for debugging)
 */
export async function getMetricsJSON(): Promise<any> {
  try {
    const metrics = await register.getMetricsAsJSON();
    return metrics;
  } catch (error) {
    logger.error('Error getting metrics as JSON:', error);
    return { error: 'Failed to retrieve metrics' };
  }
}

