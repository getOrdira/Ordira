// src/controllers/manufacturerAccount.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/manufacturerAuth.middleware';
import * as svc from '../services/business/manufacturerAccount.service';

export async function getManufacturerProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const mfgId  = req.userId!;  // set by authenticateManufacturer
    const profile = await svc.getManufacturerAccount(mfgId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateManufacturerProfile(
  req: AuthRequest & { body: Partial<ReturnType<typeof svc.getManufacturerAccount>> },
  res: Response,
  next: NextFunction
) {
  try {
    const mfgId = req.userId!;
    const data  = req.body;
    const updated = await svc.updateManufacturerAccount(mfgId, data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

