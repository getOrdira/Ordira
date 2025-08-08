// src/controllers/shopify.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as shopifyService from '../services/external/shopify.service';

// Initiate OAuth install flow
export async function connectShopify(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const url = await shopifyService.generateInstallUrl(req.user.id);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

// OAuth callback
export async function oauthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { shop, code, state } = req.query;
    await shopifyService.exchangeCode(shop as string, code as string, state as string);
    res.send('✅ Shopify connected. You can close this window.');
  } catch (err) {
    next(err);
  }
}

// Webhook handler for orders/create
export async function handleOrderWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawBody = req.body as Buffer;
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}