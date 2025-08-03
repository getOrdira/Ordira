// src/controllers/manufacturerProfile.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/manufacturerProfile.service';

export async function listManufacturerProfiles(
  _req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const profiles = await svc.listManufacturerProfiles();
    res.json({ manufacturers: profiles });
  } catch (err) {
    next(err);
  }
}

export async function getManufacturerProfile(
  req: Request<{ id: string }>, 
  res: Response, 
  next: NextFunction
) {
  try {
    const profile = await svc.getManufacturerProfile(req.params.id);
    res.json({ manufacturer: profile });
  } catch (err) {
    next(err);
  }
}
