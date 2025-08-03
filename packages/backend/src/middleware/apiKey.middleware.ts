// src/middleware/apiKey.middleware.ts
import { Request, Response, NextFunction } from 'express';
import * as apiKeySvc from '../services/apiKey.service';

export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers['x-api-key'];
  if (typeof header !== 'string') {
    return res.status(401).json({ error: 'Missing API key' });
  }
  const businessId = await apiKeySvc.verifyApiKey(header);
  if (!businessId) {
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }
  // attach to request so controllers can scope to the right brand
  (req as any).businessId = businessId;
  next();
}
