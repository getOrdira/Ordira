// src/controllers/brandSettings.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as brandSettingsService from '../services/brandSettings.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

/**
 * GET /settings
 * Retrieve the brand's settings
 */
export async function getBrandSettings(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const settings   = await brandSettingsService.getSettings(businessId);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /settings
 * Update various brand settings
 */
export async function updateBrandSettings(
  req: TenantRequest & { body: any },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const settings   = await brandSettingsService.updateSettings(businessId, req.body);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /settings/certificate-wallet
 * Update the default wallet address for certificate minting
 */
export async function updateCertificateWallet(
  req: TenantRequest & { body: { certificateWallet: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const { certificateWallet } = req.body;
    const result = await brandSettingsService.updateCertificateWallet(
      businessId,
      certificateWallet
    );
    res.json({ certificateWallet: result.certificateWallet });
  } catch (err) {
    next(err);
  }
}
