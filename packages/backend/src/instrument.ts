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
import { httpIntegration, onUncaughtExceptionIntegration, onUnhandledRejectionIntegration, consoleIntegration } from '@sentry/node';

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
    debug: process.env.SENTRY_DEBUG === 'true',
    // Focus on error tracking, not tracing (OpenTelemetry handles that)
    integrations: [
      httpIntegration(), 
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
      consoleIntegration()
    ],
    // Handle errors and logs separately
    beforeSend(event, hint) {
      // Allow logs through (from consoleIntegration) - these should go to Sentry Logs
      // Logs have type 'log' or come from console methods
      const isLog = event.type === 'log' || 
                   (event.logger && event.logger.includes('console')) ||
                   event.tags?.source === 'console';
      
      // Allow errors, fatal events, and logs through
      if (event.level === 'error' || event.level === 'fatal' || isLog) {
        // Log in debug mode
        if (process.env.SENTRY_DEBUG === 'true') {
          console.log('[Sentry Debug] Event being sent:', {
            level: event.level,
            type: event.type,
            message: event.message,
            eventId: event.event_id,
            tags: event.tags,
            isLog
          });
        }
        return event;
      }
      
      // Filter out other non-error events (traces, etc.)
      if (process.env.SENTRY_DEBUG === 'true') {
        console.log('[Sentry Debug] Event filtered out (not error/fatal/log):', event.level, event.type);
      }
      return null; // Don't send to Sentry, OpenTelemetry handles non-errors
    },
    // Handle logs separately (for consoleIntegration)
    beforeSendLog(log) {
      // Allow all logs through to Sentry Logs
      if (process.env.SENTRY_DEBUG === 'true') {
        console.log('[Sentry Debug] Log being sent to Sentry:', log);
      }
      return log;
    }
  });
  
  // Log initialization
  if (process.env.SENTRY_DEBUG === 'true') {
    console.log('[Sentry Debug] Sentry initialized with DSN:', 
      process.env.SENTRY_DSN ? `${process.env.SENTRY_DSN.substring(0, 30)}...` : 'not set');
  }
}

