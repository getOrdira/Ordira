// src/controllers/domainMapping.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as domainMappingService from '../services/domainMapping.service';

/**
 * POST /api/domain-mappings
 * Add a new custom domain mapping for the authenticated brand.
 */
export async function addDomain(
  req: AuthRequest & { body: { domain: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.userId!;      // populated by `authenticate`
    const { domain } = req.body;

    // Call the service to create the mapping
    const result = await domainMappingService.createDomainMapping(
      process.env.GCP_PROJECT_ID!,
      process.env.GCP_REGION!,
      businessId,
      domain
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

