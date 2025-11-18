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

  // Helmet security headers with hardened CSP
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Scripts: More restrictive - avoid unsafe-inline when possible
        // Note: Some legacy code may require unsafe-inline, but we should minimize it
        scriptSrc: ["'self'", ...(isProduction ? [] : ["'unsafe-eval'"])], // Only allow eval in dev
        // Styles: Allow unsafe-inline for CSS frameworks and inline styles
        // This is often necessary for dynamic styling, but consider nonces for critical styles
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "wss:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        objectSrc: ["'none'"], // Prevent plugins
        childSrc: ["'self'"],
        workerSrc: ["'self'"],
        baseUri: ["'self'"], // Restrict base tag
        formAction: ["'self'"], // Restrict form submissions
        frameAncestors: ["'none'"], // Prevent embedding
        upgradeInsecureRequests: [] // Upgrade HTTP to HTTPS
      },
      // Report CSP violations in production if reportUri is configured
      reportOnly: false,
      ...(isProduction && process.env.CSP_REPORT_URI ? {
        reportUri: process.env.CSP_REPORT_URI
      } : {})
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }));

  // MongoDB sanitization to prevent NoSQL injection
  app.use(mongoSanitize());

  logger.info('✅ Security middleware configured');
}

