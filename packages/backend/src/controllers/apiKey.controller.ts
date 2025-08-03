// src/controllers/apiKey.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as apiKeySvc from '../services/apiKey.service';

/**
 * POST /api/brand/api-keys
 * Create a new API key for the authenticated brand.
 */
export async function createKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const result     = await apiKeySvc.createApiKey(businessId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/brand/api-keys
 * List all API keys for the authenticated brand.
 */
export async function listKeys(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const keys       = await apiKeySvc.listApiKeys(businessId);
    res.json({ keys });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/brand/api-keys/:keyId
 * Revoke a specific API key by ID for the authenticated brand.
 */
export async function revokeKey(
  req: AuthRequest & { params: { keyId: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const { keyId }  = req.params;
    const doc        = await apiKeySvc.revokeApiKey(keyId, businessId);
    res.json({ key: doc.key, revoked: doc.revoked });
  } catch (err) {
    next(err);
  }
}

