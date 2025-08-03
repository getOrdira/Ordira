// src/middleware/tenant.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { BrandSettings, IBrandSettings } from '../models/brandSettings.model';

interface TenantRequest extends Request {
  tenant?: IBrandSettings;
}

const BASE_DOMAIN = process.env.BASE_DOMAIN!; // e.g. "dashboard.yoursaas.com"

export async function resolveTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const host = req.hostname.toLowerCase(); 
    let settings: IBrandSettings | null = null;

    if (host.endsWith(BASE_DOMAIN)) {
      // strip the “.dashboard.yoursaas.com” suffix to get the subdomain
      const subdomain = host.slice(0, host.length - BASE_DOMAIN.length - 1);
      settings = await BrandSettings.findOne({ subdomain });
    } else {
      // custom domain case
      settings = await BrandSettings.findOne({ customDomain: host });
    }

    if (!settings) {
      return res.status(404).json({ error: 'Brand not found.' });
    }

    // Attach the BrandSettings doc to req.tenant
    req.tenant = settings;
    next();
  } catch (err) {
    next(err);
  }
}
