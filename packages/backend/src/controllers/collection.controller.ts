// src/controllers/collection.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as collectionService from '../services/collection.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

export async function listCollections(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId   = req.tenant!.business.toString();
    const collections  = await collectionService.listCollections(businessId);
    res.json({ collections });
  } catch (err) {
    next(err);
  }
}

export async function getCollection(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId  = req.tenant!.business.toString();
    const collection  = await collectionService.getCollection(req.params.id, businessId);
    res.json({ collection });
  } catch (err) {
    next(err);
  }
}

export async function createCollection(
  req: TenantRequest & { body: any },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId  = req.tenant!.business.toString();
    const collection  = await collectionService.createCollection(req.body, businessId);
    res.status(201).json({ collection });
  } catch (err) {
    next(err);
  }
}

export async function updateCollection(
  req: TenantRequest & { body: any },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId  = req.tenant!.business.toString();
    const collection  = await collectionService.updateCollection(req.params.id, req.body, businessId);
    res.json({ collection });
  } catch (err) {
    next(err);
  }
}

export async function deleteCollection(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    await collectionService.deleteCollection(req.params.id, businessId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

