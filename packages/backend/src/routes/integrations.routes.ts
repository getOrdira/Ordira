// src/routes/integrations.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.middleware';
import shopifyRouter from './integrations/shopify.routes';
import wooRouter from './integrations/woocommerce.routes';
import wixRouter from './integrations/wix.routes';

const integrationsRouter = Router();

// Apply dynamic rate limiting to all integration routes
integrationsRouter.use(dynamicRateLimiter());

// Apply authentication to most routes (webhooks are excluded in sub-routers)
// Note: Individual integration routers handle auth for specific endpoints

// Integration sub-routers
integrationsRouter.use('/shopify', shopifyRouter);
integrationsRouter.use('/woocommerce', wooRouter);
integrationsRouter.use('/wix', wixRouter);

export default integrationsRouter;
