// src/controllers/product.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

export async function listProducts(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const products   = await productService.listProducts(businessId);
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const product    = await productService.getProduct(req.params.id, businessId);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(
  req: TenantRequest & { body: any },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const product    = await productService.createProduct(req.body, businessId);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(
  req: TenantRequest & { body: any },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    const product    = await productService.updateProduct(req.params.id, req.body, businessId);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.tenant!.business.toString();
    await productService.deleteProduct(req.params.id, businessId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
