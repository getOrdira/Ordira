// src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

export async function getVotesAnalytics(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const data       = await analyticsService.getVotesAnalytics(businessId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTransactionsAnalytics(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const data       = await analyticsService.getTransactionsAnalytics(businessId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
