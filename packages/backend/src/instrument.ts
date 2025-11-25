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

// Suppress verbose Sentry logger messages (client reports, flushing, instrumentation, etc.)
// These are informational and clutter logs in production
if (process.env.SENTRY_DSN && process.env.SENTRY_DEBUG !== 'true') {
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    // Filter out all verbose Sentry logger messages unless in debug mode
    if (message.includes('Sentry Logger [log]')) {
      // Suppress all Sentry Logger [log] messages (they're all verbose)
      return;
    }
    // Also filter OpenTelemetry instrumentation messages from Sentry
    if (
      message.includes('@opentelemetry_sentry-patched') ||
      message.includes('@sentry/instrumentation-http') ||
      message.includes('Instrumentation suppressed') ||
      message.includes('[Tracing] Not injecting trace data') ||
      message.includes('Sending request session aggregate') ||
      message.includes('Sending outcomes:')
    ) {
      return; // Suppress these messages
    }
    originalLog.apply(console, args);
  };
}

// Only initialize if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
    // Lower trace sample rate since OpenTelemetry handles traces
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,
    environment: process.env.NODE_ENV || 'development',
    // Only enable debug mode if explicitly requested (suppresses verbose logs when false)
    debug: process.env.SENTRY_DEBUG === 'true',
    // Focus on error tracking, not tracing (OpenTelemetry handles that)
    integrations: [
      httpIntegration(), 
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
      consoleIntegration()
    ],
    
    beforeSend(event, hint) {
      // Log in debug mode to see what's being sent
      if (process.env.SENTRY_DEBUG === 'true') {
        console.log('[Sentry Debug] Event being sent:', {
          level: event.level,
          type: event.type,
          message: event.message,
          eventId: event.event_id
        });
      }
      
      return event;
    }
  });
  
  // Log initialization
  if (process.env.SENTRY_DEBUG === 'true') {
    console.log('[Sentry Debug] Sentry initialized with DSN:', 
      process.env.SENTRY_DSN ? `${process.env.SENTRY_DSN.substring(0, 30)}...` : 'not set');
  }
}

