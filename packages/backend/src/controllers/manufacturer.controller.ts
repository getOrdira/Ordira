// src/controllers/manufacturer.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/manufacturerAuth.middleware';
import * as mfgService from '../services/business/manufacturer.service';

/**
 * POST /api/manufacturer/register
 */
export async function register(
  req: Request<{}, {}, { name: string; email: string; password: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, email, password } = req.body;
    const result = await mfgService.register({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;
    const result = await mfgService.login({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listBrandsForManufacturer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const mfgId = req.userId!;
    const brands = await mfgService.listBrandsForManufacturer(mfgId);
    res.json({ brands });
  } catch (err) {
    next(err);
  }
}

export async function getResultsForBrand(
  req: AuthRequest & { params: { brandSettingsId: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const mfgId            = req.userId!;
    const { brandSettingsId } = req.params;
    const results = await mfgService.getResultsForBrand(mfgId, brandSettingsId);
    res.json({ results });
  } catch (err) {
    next(err);
  }
}
