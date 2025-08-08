// src/controllers/woocommerce.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as wooService from '../services/external/shopify.service'; // replace with actual WooCommerce service

export async function connectWooCommerce(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const url = await wooService.generateInstallUrl(req.user.id);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

export async function oauthCallbackWoo(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state } = req.query;
    await wooService.exchangeCode(req.query.shop as string, code as string, state as string);
    res.send('✅ WooCommerce connected. You can close this window.');
  } catch (err) {
    next(err);
  }
}

export async function handleOrderWebhookWoo(req: Request, res: Response, next: NextFunction) {
  try {
    await wooService.processOrderWebhook(req);
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}