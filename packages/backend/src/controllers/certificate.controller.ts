// src/controllers/certificate.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as certService from '../services/certificate.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

export async function createCert(
  req: TenantRequest & { body: { productId: string; recipient: string; contactMethod: 'email' | 'sms' } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const cert       = await certService.createCertificate(businessId, req.body);
    res.status(201).json(cert);
  } catch (err) {
    next(err);
  }
}

export async function listCerts(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const certs      = await certService.listCertificates(businessId);
    res.json({ certificates: certs });
  } catch (err) {
    next(err);
  }
}

