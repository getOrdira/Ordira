// src/controllers/domainMapping.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as domainMappingService from '../services/external/domainMapping.service';

/**
 * POST /api/domain-mappings
 * Add a new custom domain mapping for the authenticated brand.
 */
export async function addDomainMapping(
  req: AuthRequest & { body: { domain: string } },
  res: Response,
  next: NextFunction
) {
  const businessId = req.userId!;      // populated by `authenticate`
  const { domain } = req.body;        // e.g. "vote.brandname.com"

  try {
    // Create the mapping and get back the CNAME instruction
    const instruction = await domainMappingService.createDomainMapping(
      businessId,
      domain
    );

    // Return the CNAME record the brand needs to add
    return res.status(201).json(instruction);

  } catch (err) {
    // If something went wrong (validation, duplicate, etc), forward to error handler
    return next(err);
  }
}

