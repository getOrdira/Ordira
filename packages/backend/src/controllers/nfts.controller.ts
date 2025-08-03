// src/controllers/nfts.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as nftsService from '../services/nfts.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

/**
 * POST /nfts/deploy
 */
export async function deployNft(
  req: TenantRequest & { body: { name: string; symbol: string; baseUri: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const contract   = await nftsService.deployContract(req.body, businessId);
    res.status(201).json(contract);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /nfts/contracts
 */
export async function listNftContracts(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const list       = await nftsService.listContracts(businessId);
    res.json({ contracts: list });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /nfts/mint
 */
export async function mintNft(
  req: TenantRequest & { body: { productId: string; recipient: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const result     = await nftsService.mintNft(businessId, {
      productId: req.body.productId,
      recipient: req.body.recipient
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /nfts/certificates?productId=<optional>
 */
export async function listCertificates(
  req: TenantRequest & { query: { productId?: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const { productId } = req.query;
    const certificates = await nftsService.listCertificates(businessId, productId);
    res.json(certificates);
  } catch (err) {
    next(err);
  }
}
