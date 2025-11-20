/**
 * Monitoring Middleware Configuration
 * 
 * Centralizes monitoring and observability middleware setup including
 * Sentry integration for error tracking and OpenTelemetry for distributed tracing.
 * 
 * Note: OpenTelemetry handles traces/metrics, Sentry handles errors.
 * They work together - OpenTelemetry for observability, Sentry for error tracking.
 */

import { Application, Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../../logging';
import { getOpenTelemetryService } from '../../observability';

/**
 * Configure and apply monitoring middleware to the Express application
 * 
 * @param app - Express application instance
 */
export function configureMonitoringMiddleware(app: Application): void {
  logger.info('📊 Configuring monitoring middleware...');

  // Check if OpenTelemetry is initialized
  const otelService = getOpenTelemetryService();
  if (otelService && otelService.isInitialized()) {
    logger.info('✅ OpenTelemetry is active - using for traces and metrics');
  } else {
    logger.warn('⚠️ OpenTelemetry not initialized - some observability features may be limited');
  }

  // Sentry request handler (Sentry is initialized in instrument.ts)
  // This must be added before routes to capture request context
  // In Sentry v10, request context is automatically captured via Express integration
  if (process.env.SENTRY_DSN) {
    logger.info('✅ Sentry request context will be captured automatically (Sentry initialized in instrument.ts)');
  } else {
    logger.warn('⚠️ Sentry DSN not configured, skipping Sentry request handler');
  }

  logger.info('✅ Monitoring middleware configured');
}

/**
 * Configure Sentry error handler (should be added after routes, before other error handlers)
 * 
 * @param app - Express application instance
 */
export function configureSentryErrorHandler(app: Application): void {
  if (process.env.SENTRY_DSN) {
    // Error handler must be before any other error middleware and after all controllers
    // In Sentry v10, we manually capture errors in Express error handler
    app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      // Capture all errors (500+ status codes or errors without status)
      const status = Number(error.status) || 500;
      if (status >= 500) {
        Sentry.captureException(error, {
          tags: {
            endpoint: req.path,
            method: req.method,
            statusCode: status
          },
          extra: {
            requestId: req.headers['x-request-id'],
            userAgent: req.headers['user-agent'],
            ip: req.ip
          }
        });
      }
      // Continue to next error handler
      next(error);
    });
    logger.info('✅ Sentry error handler configured');
  }
}

