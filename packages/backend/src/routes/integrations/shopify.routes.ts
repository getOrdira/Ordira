// src/routes/integrations/shopify.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  connectShopify,
  oauthCallback,
  handleOrderWebhook
} from '../../controllers/shopify.controller';
import express from 'express'

const router = Router();

/**
 * Initiates the OAuth install flow for merchants to connect their Shopify store
 */
router.get(
  '/connect',
  authenticate,
  connectShopify
);

/**
 * OAuth callback endpoint Shopify redirects to after merchant approval
 */
router.get(
  '/oauth/callback',
  oauthCallback
);

/**
 * Webhook endpoint for shopify orders/create events
 * Use express.raw() on this route to capture raw body for HMAC validation
 */
router.post(
  '/webhook/orders/create',
   express.raw({ type: 'application/json' }),
  handleOrderWebhook
);

export default router;
