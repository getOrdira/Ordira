// src/routes/integrations/wix.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  connectWix,
  oauthCallbackWix as wixOauthCallback,
  handleOrderWebhookWix as handleWixWebhook
} from '../../controllers/wix.controller';

const wixRouter = Router();

/**
 * Initiates the OAuth install flow for merchants to connect their Wix store
 */
wixRouter.get(
  '/connect',
  authenticate,
  connectWix
);

/**
 * OAuth callback endpoint Wix redirects to after merchant approval
 */
wixRouter.get(
  '/oauth/callback',
  wixOauthCallback
);

/**
 * Webhook endpoint for Wix orders/create events
 */
wixRouter.post(
  '/webhook/orders/create',
  handleWixWebhook
);

export default wixRouter;