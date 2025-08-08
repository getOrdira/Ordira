import { Request, Response, NextFunction } from 'express';
import * as invSvc from '../services/business/invitation.service';

interface TenantRequest extends Request {
  tenant?: { business: { toString: () => string } };
}

interface MfgRequest extends Request {
  user?: { id: string };
}

/**
 * Brand sends an invite to a manufacturer
 * POST /api/invitations/brand
 * body: { manufacturerId: string }
 */
export async function sendInviteAsBrand(
  req: TenantRequest & { body: { manufacturerId: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const brandId = req.tenant!.business.toString();
    const invite  = await invSvc.sendInvite(brandId, req.body.manufacturerId);
    res.status(201).json(invite);
  } catch (err) {
    next(err);
  }
}

/**
 * Brand views incoming invites (if manufacturers can invite brands)
 * GET /api/invitations/brand
 */
export async function listInvitesForBrand(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const brandId = req.tenant!.business.toString();
    const invites = await invSvc.listInvitesForBrand(brandId);
    res.json({ invites });
  } catch (err) {
    next(err);
  }
}

/**
 * Manufacturer views invites
 * GET /api/invitations/manufacturer
 */
export async function listInvitesForManufacturer(
  req: MfgRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const mfgId   = req.user!.id;
    const invites = await invSvc.listInvitesForManufacturer(mfgId);
    res.json({ invites });
  } catch (err) {
    next(err);
  }
}

/**
 * Manufacturer accepts or declines an invite
 * POST /api/invitations/respond/:inviteId
 * body: { accept: boolean }
 */
export async function respondToInvite(
  req: MfgRequest & { body: { accept: boolean }; params: { inviteId: string } },
  res: Response,
  next: NextFunction
) {
  try {
    const mfgId   = req.user!.id;
    const { inviteId } = req.params;
    const { accept }   = req.body;
    const invite       = await invSvc.respondInvite(inviteId, accept, mfgId);
    res.json(invite);
  } catch (err) {
    next(err);
  }
}
