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

  // Sentry monitoring (for error tracking - works alongside OpenTelemetry)
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Lower trace sample rate since OpenTelemetry handles traces
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,
      environment: process.env.NODE_ENV,
      // Focus on error tracking, not tracing (OpenTelemetry handles that)
      integrations: [
        new Sentry.Integrations.Http({ tracing: false }), // Disable Sentry tracing, use OpenTelemetry
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection()
      ],
      // Only capture errors, not all traces
      beforeSend(event) {
        // Filter out non-error events if OpenTelemetry is active
        if (otelService?.isInitialized() && event.level !== 'error' && event.level !== 'fatal') {
          return null; // Don't send to Sentry, OpenTelemetry handles it
        }
        return event;
      }
    });
    
    app.use(Sentry.Handlers.requestHandler());
    // Don't use Sentry tracing handler - OpenTelemetry handles tracing
    logger.info('✅ Sentry error tracking initialized (OpenTelemetry handles traces)');
  } else {
    logger.warn('⚠️ Sentry DSN not configured, skipping Sentry initialization');
  }

  logger.info('✅ Monitoring middleware configured');
}

/**
 * Configure Sentry error handler (should be added after routes)
 * 
 * @param app - Express application instance
 */
export function configureSentryErrorHandler(app: Application): void {
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler({
      shouldHandleError: (error: any) => {
        return Number(error.status) >= 500;
      }
    }));
  }
}

