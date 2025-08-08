// src/controllers/brandAccount.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as brandAccountService from '../services/business/brandAccount.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getBrandProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const profile    = await brandAccountService.getBrandAccount(businessId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateBrandProfile(
  req: AuthRequest & { body: Partial<ReturnType<typeof brandAccountService.getBrandAccount>> },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;
    const updated    = await brandAccountService.updateBrandAccount(businessId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

