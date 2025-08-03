// src/controllers/brandProfile.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/brandProfile.service';

export async function listBrandProfiles(
  _req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const profiles = await svc.listBrandProfiles();
    res.json({ brands: profiles });
  } catch (err) {
    next(err);
  }
}

export async function getBrandProfile(
  req: Request<{ id: string }>, 
  res: Response, 
  next: NextFunction
) {
  try {
    const profile = await svc.getBrandProfile(req.params.id);
    res.json({ brand: profile });
  } catch (err) {
    next(err);
  }
}
