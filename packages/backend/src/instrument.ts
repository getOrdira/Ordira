/**
 * Sentry Instrumentation
 * 
 * Initialize Sentry as early as possible in the application lifecycle.
 * This file must be imported at the very top of index.ts before any other imports.
 * 
 * Sentry handles error tracking, while OpenTelemetry handles distributed tracing.
 * They work together - Sentry for errors, OpenTelemetry for observability.
 */

import * as Sentry from '@sentry/node';

// Only initialize if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // Lower trace sample rate since OpenTelemetry handles traces
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,
    environment: process.env.NODE_ENV || 'development',
    // Focus on error tracking, not tracing (OpenTelemetry handles that)
    integrations: [
      new Sentry.Integrations.Http({ tracing: false }), // Disable Sentry tracing, use OpenTelemetry
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection()
    ],
    // Only capture errors, not all traces
    beforeSend(event) {
      // Filter out non-error events - focus on actual errors
      if (event.level !== 'error' && event.level !== 'fatal') {
        return null; // Don't send to Sentry, OpenTelemetry handles non-errors
      }
      return event;
    }
  });
}

