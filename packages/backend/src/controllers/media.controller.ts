// src/controllers/media.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as mediaService from '../services/business/media.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
  file?: Express.Multer.File;
}

export async function uploadMedia(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const media = await mediaService.saveMedia(req.file!, businessId);
    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
}

export async function listMedia(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const mediaList = await mediaService.listMediaByUser(businessId);
    res.json({ media: mediaList });
  } catch (err) {
    next(err);
  }
}
