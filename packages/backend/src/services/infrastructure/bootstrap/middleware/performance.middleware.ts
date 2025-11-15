/**
 * Performance Middleware Configuration
 * 
 * Centralizes performance-related middleware setup including compression,
 * logging, and metrics tracking.
 */

import { Application } from 'express';
import compression from 'compression';
import { logger } from '../../logging';
import {
  productionLoggingMiddleware,
  developmentLoggingMiddleware,
  metricsMiddleware
} from '../../../../middleware';

/**
 * Configure and apply performance middleware to the Express application
 * 
 * @param app - Express application instance
 * @returns Array of applied middleware for reference
 */
export function configurePerformanceMiddleware(app: Application): void {
  logger.info('⚡ Configuring performance middleware...');

  // Enhanced Compression with optimized settings
  app.use(compression({
    level: 6,                    // Compression level (1-9, 6 is good balance)
    threshold: 100 * 1024,       // Only compress responses > 100KB
    memLevel: 8,                 // Memory level (1-9, 8 is default)
    windowBits: 15,              // Window size
    chunkSize: 16 * 1024,        // 16KB chunks
    filter: (req, res) => {
      // Don't compress if explicitly disabled
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Don't compress responses that are already compressed
      const contentEncoding = res.getHeader('Content-Encoding');
      if (contentEncoding) {
        return false;
      }

      // Don't compress certain content types
      const contentType = res.getHeader('Content-Type');
      if (contentType) {
        const type = contentType.toString().toLowerCase();
        const excludeTypes = [
          'image/',
          'video/',
          'audio/',
          'application/zip',
          'application/gzip',
          'application/x-compressed',
          'application/pdf'
        ];

        if (excludeTypes.some(excludeType => type.includes(excludeType))) {
          return false;
        }
      }

      // Use built-in filter for everything else
      return compression.filter(req, res);
    }
  }));

  // Use modular logging middleware for request/response tracking
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production') {
    app.use(productionLoggingMiddleware);
  } else {
    app.use(developmentLoggingMiddleware);
  }
  
  // Add Prometheus metrics tracking
  app.use(metricsMiddleware);

  logger.info('✅ Performance middleware configured');
}

