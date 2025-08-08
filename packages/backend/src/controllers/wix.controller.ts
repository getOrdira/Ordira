// src/controllers/wix.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as wixService from '../services/external/wix.service';

export async function connectWix(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const url = await wixService.generateInstallUrl(req.user.id);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

export async function oauthCallbackWix(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, context } = req.query;
    await wixService.exchangeCode(code as string, context as string);
    res.send('✅ Wix connected. You can close this window.');
  } catch (err) {
    next(err);
  }
}

export async function handleOrderWebhookWix(req: Request, res: Response, next: NextFunction) {
  try {
    await wixService.processOrderWebhook(req);
    res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
}