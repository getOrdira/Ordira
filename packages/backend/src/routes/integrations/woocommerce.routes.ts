// src/routes/integrations/woocommerce.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  connectWooCommerce,
  oauthCallbackWoo as wooOauthCallback,
  handleOrderWebhookWoo as handleWooWebhook
} from '../../controllers/woocommerce.controller';

const wooRouter = Router();

/**
 * Initiates the OAuth install flow for merchants to connect their WooCommerce store
 */
wooRouter.get(
  '/connect',
  authenticate,
  connectWooCommerce
);

/**
 * OAuth callback endpoint WooCommerce redirects to after merchant approval
 */
wooRouter.get(
  '/oauth/callback',
  wooOauthCallback
);

/**
 * Webhook endpoint for WooCommerce orders/create events
 */
wooRouter.post(
  '/webhook/orders/create',
  handleWooWebhook
);

export default wooRouter;