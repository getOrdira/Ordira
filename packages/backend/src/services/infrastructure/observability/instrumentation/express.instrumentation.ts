/**
 * Express Instrumentation
 * 
 * Custom Express.js instrumentation for OpenTelemetry.
 * Automatically creates spans for HTTP requests and records metrics.
 */

import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { logger } from '../../../../utils/logger';

let expressInstrumentation: ExpressInstrumentation | null = null;
let httpInstrumentation: HttpInstrumentation | null = null;

/**
 * Setup Express instrumentation
 */
export async function setupExpressInstrumentation(): Promise<void> {
  try {
    // HTTP instrumentation (required for Express)
    httpInstrumentation = new HttpInstrumentation({
      // Ignore health check endpoints
      ignoreIncomingRequestHook: (req) => {
        const url = req.url || '';
        return url === '/health' || url === '/metrics' || url.startsWith('/.well-known');
      }
    });

    // Express instrumentation
    expressInstrumentation = new ExpressInstrumentation({
      // Request/response hooks
      requestHook: (span, info) => {
        // Add custom attributes
        if (info.route) {
          span.setAttribute('express.route', info.route);
        }
        if (info.request?.method) {
          span.setAttribute('express.method', info.request.method);
        }
      }
    });

    logger.info('✅ Express instrumentation configured');
  } catch (error: any) {
    logger.error('❌ Failed to setup Express instrumentation:', error);
    throw error;
  }
}

/**
 * Get Express instrumentation instance
 */
export function getExpressInstrumentation(): ExpressInstrumentation | null {
  return expressInstrumentation;
}

/**
 * Get HTTP instrumentation instance
 */
export function getHttpInstrumentation(): HttpInstrumentation | null {
  return httpInstrumentation;
}

