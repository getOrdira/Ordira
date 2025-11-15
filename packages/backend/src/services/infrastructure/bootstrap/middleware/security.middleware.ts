/**
 * Security Middleware Configuration
 * 
 * Centralizes security-related middleware setup including Helmet,
 * MongoDB sanitization, and other security headers.
 */

import { Application } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { logger } from '../../logging';

/**
 * Configure and apply security middleware to the Express application
 * 
 * @param app - Express application instance
 * @returns Array of applied middleware for reference
 */
export function configureSecurityMiddleware(app: Application): void {
  logger.info('🔒 Configuring security middleware...');

  // Helmet security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "wss:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        objectSrc: ["'none'"],
        childSrc: ["'self'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // MongoDB sanitization to prevent NoSQL injection
  app.use(mongoSanitize());

  logger.info('✅ Security middleware configured');
}

