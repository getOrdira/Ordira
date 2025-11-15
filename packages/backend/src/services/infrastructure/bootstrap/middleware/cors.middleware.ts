/**
 * CORS Middleware Configuration
 * 
 * Centralizes CORS middleware setup with environment-specific configuration.
 */

import { Application } from 'express';
import { logger } from '../../logging';
import {
  productionCorsMiddleware,
  developmentCorsMiddleware
} from '../../../../middleware';

/**
 * Configure and apply CORS middleware to the Express application
 * 
 * @param app - Express application instance
 */
export function configureCorsMiddleware(app: Application): void {
  logger.info('🌐 Configuring CORS middleware...');

  // Use modular CORS middleware with environment-specific configuration
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production') {
    app.use(productionCorsMiddleware);
  } else {
    app.use(developmentCorsMiddleware);
  }
  
  logger.info('✅ CORS middleware configured');
}

