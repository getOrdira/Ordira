// src/controllers/invitation.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ManufacturerAuthRequest } from '../middleware/manufacturerAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { InvitationService } from '../services/business/invitation.service';

// Initialize service
const invitationService = new InvitationService();

/**
 * Extended request interfaces for type safety
 */
interface BrandInviteRequest extends AuthRequest, ValidatedRequest {
  tenant?: { business: { toString: () => string } };
  validatedBody: { manufacturerId: string };
}

interface ManufacturerInviteRequest extends ManufacturerAuthRequest, ValidatedRequest {
  validatedBody: { accept: boolean };
  validatedParams: { inviteId: string };
}

/**
 * Brand sends an invitation to a manufacturer
 * POST /api/invitations/brand
 * 
 * @requires authentication (brand)
 * @requires validation: { manufacturerId: string }
 */
export const sendInviteAsBrand = asyncHandler(async (
  req: BrandInviteRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract brand ID from tenant context
  const brandId = req.tenant?.business?.toString();
  if (!brandId) {
    throw createAppError('Brand context not found', 400, 'MISSING_BRAND_CONTEXT');
  }

  // Extract validated manufacturer ID
  const { manufacturerId } = req.validatedBody;

  // Send invitation through service
  const invitation = await invitationService.sendInvite(brandId, manufacturerId);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Invitation sent successfully',
    data: {
      invitation: {
        id: invitation._id.toString(),
        manufacturerId: invitation.manufacturer.toString(),
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }
    }
  });
});

/**
 * Brand views all invitations (sent and received)
 * GET /api/invitations/brand
 * 
 * @requires authentication (brand)
 * @optional query params: { status?: string, page?: number, limit?: number }
 */
export const listInvitesForBrand = asyncHandler(async (
  req: AuthRequest & { tenant?: { business: { toString: () => string } } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract brand ID from tenant context
  const brandId = req.tenant?.business?.toString();
  if (!brandId) {
    throw createAppError('Brand context not found', 400, 'MISSING_BRAND_CONTEXT');
  }

  // Get invitations through service
  const invitations = await invitationService.listInvitesForBrand(brandId);

  // Get connection stats for additional context
  const connectionStats = await invitationService.getConnectionStats(brandId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Invitations retrieved successfully',
    data: {
      invitations,
      stats: connectionStats,
      pagination: {
        total: invitations.length,
        page: 1,
        limit: invitations.length
      }
    }
  });
});

/**
 * Manufacturer views received invitations
 * GET /api/invitations/manufacturer
 * 
 * @requires manufacturerAuth
 * @optional query params: { status?: string, page?: number, limit?: number }
 */
export const listInvitesForManufacturer = asyncHandler(async (
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Get invitations through service
  const invitations = await invitationService.listInvitesForManufacturer(manufacturerId);

  // Get connection stats for additional context
  const connectionStats = await invitationService.getManufacturerConnectionStats(manufacturerId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Invitations retrieved successfully',
    data: {
      invitations,
      stats: connectionStats,
      pagination: {
        total: invitations.length,
        page: 1,
        limit: invitations.length
      }
    }
  });
});

/**
 * Manufacturer responds to an invitation (accept/decline)
 * POST /api/invitations/respond/:inviteId
 * 
 * @requires manufacturerAuth
 * @requires validation: { accept: boolean }
 * @requires params: { inviteId: string }
 */
export const respondToInvite = asyncHandler(async (
  req: ManufacturerInviteRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from auth context
  const manufacturerId = req.userId;
  if (!manufacturerId) {
    throw createAppError('Manufacturer ID not found in request', 401, 'MISSING_MANUFACTURER_ID');
  }

  // Extract validated data
  const { inviteId } = req.validatedParams;
  const { accept } = req.validatedBody;

  // Process response through service
  const updatedInvitation = await invitationService.respondInvite(inviteId, accept, manufacturerId);

  // Determine response message
  const actionMessage = accept ? 'accepted' : 'declined';
  
  // Return standardized response
  res.json({
    success: true,
    message: `Invitation ${actionMessage} successfully`,
    data: {
      invitation: {
        id: updatedInvitation._id.toString(),
        brandId: updatedInvitation.brand.toString(),
        status: updatedInvitation.status,
        respondedAt: updatedInvitation.respondedAt,
        createdAt: updatedInvitation.createdAt
      },
      action: actionMessage
    }
  });
});

/**
 * Brand cancels a pending invitation
 * DELETE /api/invitations/:inviteId
 * 
 * @requires authentication (brand)
 * @requires params: { inviteId: string }
 */
export const cancelInvite = asyncHandler(async (
  req: AuthRequest & { 
    tenant?: { business: { toString: () => string } };
    params: { inviteId: string };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract brand ID from tenant context
  const brandId = req.tenant?.business?.toString();
  if (!brandId) {
    throw createAppError('Brand context not found', 400, 'MISSING_BRAND_CONTEXT');
  }

  // Extract invitation ID
  const { inviteId } = req.params;

  // Cancel invitation through service
  await invitationService.cancelInvite(inviteId, brandId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Invitation cancelled successfully',
    data: {
      inviteId,
      status: 'cancelled'
    }
  });
});

/**
 * Get detailed invitation by ID
 * GET /api/invitations/:inviteId
 * 
 * @requires authentication (brand or manufacturer)
 * @requires params: { inviteId: string }
 */
export const getInvitationDetails = asyncHandler(async (
  req: (AuthRequest | ManufacturerAuthRequest) & { params: { inviteId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { inviteId } = req.params;

  // Get invitation details through service
  const invitation = await invitationService.getInvitationById(inviteId);

  if (!invitation) {
    throw createAppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  // Return standardized response
  res.json({
    success: true,
    message: 'Invitation details retrieved successfully',
    data: {
      invitation: {
        id: invitation._id.toString(),
        brandId: invitation.brand.toString(),
        manufacturerId: invitation.manufacturer.toString(),
        status: invitation.status,
        message: invitation.message,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        respondedAt: invitation.respondedAt,
        invitationType: invitation.invitationType,
        terms: invitation.terms,
        counterOffer: invitation.counterOffer
      }
    }
  });
});
