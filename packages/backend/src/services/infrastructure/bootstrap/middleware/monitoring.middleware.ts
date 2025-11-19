/**
 * Monitoring Middleware Configuration
 * 
 * Centralizes monitoring and observability middleware setup including
 * Sentry integration for error tracking and OpenTelemetry for distributed tracing.
 * 
 * Note: OpenTelemetry handles traces/metrics, Sentry handles errors.
 * They work together - OpenTelemetry for observability, Sentry for error tracking.
 */

import { Application } from 'express';
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
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
    // Don't use Sentry tracing handler - OpenTelemetry handles tracing
    logger.info('✅ Sentry request handler configured (Sentry initialized in instrument.ts)');
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
    app.use(Sentry.Handlers.errorHandler({
      shouldHandleError: (error: any) => {
        // Only capture 500+ errors
        return Number(error.status) >= 500;
      }
    }));
    logger.info('✅ Sentry error handler configured');
  }
}

