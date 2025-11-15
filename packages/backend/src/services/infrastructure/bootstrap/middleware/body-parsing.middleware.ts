/**
 * Body Parsing Middleware Configuration
 * 
 * Centralizes body parsing middleware setup including JSON, URL-encoded,
 * and raw body handling for webhooks.
 */

import { Application } from 'express';
import { logger } from '../../logging';

/**
 * Configure and apply body parsing middleware to the Express application
 * 
 * @param app - Express application instance
 */
export function configureBodyParsingMiddleware(app: Application): void {
  logger.info('📦 Configuring body parsing middleware...');

  // JSON parsing with size limits
  app.use(require('express').json({ 
    limit: '10mb',
    verify: (req: any, res: any, buf: Buffer) => {
      // Store raw body for webhook signature verification
      if (req.url?.includes('/webhook')) {
        req.rawBody = buf;
      }
    }
  }));

  // URL encoded parsing
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // Raw body handling for webhook endpoints
  const webhookPaths = [
    '/api/integrations/shopify/webhook',
    '/api/integrations/woocommerce/webhook',
    '/api/integrations/wix/webhook',
    '/api/billing/webhook'
  ];
  
  webhookPaths.forEach(path => {
    app.use(path, require('express').raw({ type: 'application/json', limit: '1mb' }));
  });

  logger.info('✅ Body parsing middleware configured');
}

