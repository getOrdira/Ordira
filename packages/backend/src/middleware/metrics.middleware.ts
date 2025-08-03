import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

client.collectDefaultMetrics();

// Create a Histogram for HTTP durations
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
});

// Middleware to observe each request
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
}
