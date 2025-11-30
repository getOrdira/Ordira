// src/controllers/features/connections/connectionsInvitations.controller.ts
// Controller mapping invitations and connection lifecycle endpoints

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { ConnectionsBaseController } from './connectionsBase.controller';
import { InvitationSummary } from '../../../services/connections/features/invitations.service';

type InvitationType = 'collaboration' | 'manufacturing' | 'partnership' | 'custom';

interface SendInvitationRequest extends BaseRequest {
  validatedBody: {
    manufacturerId: string;
    invitationType?: InvitationType;
    message?: string;
    terms?: Record<string, unknown>;
  };
}

interface RespondInvitationRequest extends BaseRequest {
  validatedBody: {
    inviteId: string;
    accept: boolean;
    message?: string;
  };
}

interface CancelInvitationRequest extends BaseRequest {
  validatedParams: {
    inviteId: string;
  };
}

interface InvitationLookupRequest extends BaseRequest {
  validatedParams: {
    inviteId: string;
  };
}

interface ConnectionTargetRequest extends BaseRequest {
  validatedParams: {
    manufacturerId?: string;
    brandId?: string;
  };
}

interface BulkInvitationRequest extends BaseRequest {
  validatedBody: {
    manufacturerIds: string[];
    invitationType?: InvitationType;
    message?: string;
  };
}

interface RecentActivityRequest extends BaseRequest {
  validatedQuery?: {
    entityType?: 'brand' | 'manufacturer';
    limit?: number;
    entityId?: string;
  };
}

/**
 * ConnectionsInvitationsController surfaces invitation and connection management endpoints.
 */
export class ConnectionsInvitationsController extends ConnectionsBaseController {
  /**
   * Send a brand -> manufacturer invitation.
   */
  async sendInvitation(req: SendInvitationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Validate business user first
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }
      if (req.userType !== 'business' || !req.businessId) {
        throw { statusCode: 403, message: 'Business user access required' };
      }

      const brandId = this.resolveBrandId(req);
      const { manufacturerId, invitationType, message, terms } = req.validatedBody;

      const validation = this.connectionsServices.validation.invitation.validateCreateInvitation({
        brandId,
        manufacturerId,
        invitationType,
        message,
        terms,
      });

      if (!validation.isValid) {
        throw {
          statusCode: 400,
          message: 'Invalid invitation payload',
          details: validation.errors,
        };
      }

      this.recordPerformance(req, 'SEND_INVITATION');

      const invite = await this.connectionsServices.features.invitations.sendInvite(
        brandId,
        manufacturerId,
        { invitationType, message, terms },
      );

      const summary = this.connectionsServices.utils.helpers.mapInvitationToSummary(invite as any);

      this.logAction(req, 'SEND_INVITATION_SUCCESS', {
        brandId,
        manufacturerId,
        invitationId: summary.id,
      });

      return { invitation: summary };
    }, res, 'Invitation sent successfully', this.getRequestMeta(req));
  }

  /**
   * Send multiple invitations from a single brand.
   */
  async bulkInvite(req: BulkInvitationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);
        const { manufacturerIds, invitationType, message } = req.validatedBody;

        const validation = this.connectionsServices.validation.invitation.validateBulkInvitation({
          brandId,
          manufacturerIds,
          invitationType,
          message,
        });

        if (!validation.isValid) {
          throw {
            statusCode: 400,
            message: 'Invalid bulk invitation payload',
            details: validation.errors,
          };
        }

        this.recordPerformance(req, 'BULK_INVITATION');

        const result = await this.connectionsServices.features.invitations.bulkInvite(
          brandId,
          manufacturerIds,
          { invitationType, message },
        );

        this.logAction(req, 'BULK_INVITATION_SUCCESS', {
          brandId,
          invited: result.successful.length,
          failed: result.failed.length,
        });

        return { result };
      });
    }, res, 'Bulk invitations processed', this.getRequestMeta(req));
  }

  /**
   * Manufacturer respond to an invitation.
   */
  async respondInvitation(req: RespondInvitationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Validate manufacturer user first
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }
      if (req.userType !== 'manufacturer' || !req.manufacturerId) {
        throw { statusCode: 403, message: 'Manufacturer user access required' };
      }

      const manufacturerId = this.resolveManufacturerId(req);
      const { inviteId, accept, message } = req.validatedBody;

      const validation = this.connectionsServices.validation.invitation.validateInvitationResponse({
        inviteId,
        accept,
        manufacturerId,
        message,
      });

      if (!validation.isValid) {
        throw {
          statusCode: 400,
          message: 'Invalid invitation response',
          details: validation.errors,
        };
      }

      this.recordPerformance(req, 'RESPOND_INVITATION');

      const invite = await this.connectionsServices.features.invitations.respondInvite(
        inviteId,
        accept,
        manufacturerId,
        message,
      );

      const summary = this.connectionsServices.utils.helpers.mapInvitationToSummary(invite as any);

      this.logAction(req, 'RESPOND_INVITATION_SUCCESS', {
        inviteId,
        accept,
        manufacturerId,
      });

      return { invitation: summary };
    }, res, 'Invitation response recorded', this.getRequestMeta(req));
  }

  /**
   * Cancel a pending invitation (brand initiated).
   */
  async cancelInvitation(req: CancelInvitationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Validate business user first
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }
      if (req.userType !== 'business' || !req.businessId) {
        throw { statusCode: 403, message: 'Business user access required' };
      }

      const brandId = this.resolveBrandId(req);
      const { inviteId } = req.validatedParams;

      this.recordPerformance(req, 'CANCEL_INVITATION');

      await this.connectionsServices.features.invitations.cancelInvite(inviteId, brandId);

      this.logAction(req, 'CANCEL_INVITATION_SUCCESS', {
        brandId,
        inviteId,
      });

      return { cancelled: true };
    }, res, 'Invitation cancelled', this.getRequestMeta(req));
  }

  /**
   * Fetch invitation details by identifier.
   */
  async getInvitationById(req: InvitationLookupRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const { inviteId } = req.validatedParams;

        this.recordPerformance(req, 'GET_INVITATION_BY_ID');

        const invite = await this.connectionsServices.features.invitations.getInvitationById(inviteId);
        if (!invite) {
          throw { statusCode: 404, message: 'Invitation not found' };
        }

        const summary = this.connectionsServices.utils.helpers.mapInvitationToSummary(invite as any);

        this.logAction(req, 'GET_INVITATION_BY_ID_SUCCESS', { inviteId });

        return { invitation: summary };
      });
    }, res, 'Invitation retrieved', this.getRequestMeta(req));
  }

  /**
   * List invitations for authenticated brand.
   */
  async listBrandInvitations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);

        this.recordPerformance(req, 'LIST_BRAND_INVITATIONS');

        const invitations = await this.connectionsServices.features.invitations.listInvitesForBrand(brandId);

        this.logAction(req, 'LIST_BRAND_INVITATIONS_SUCCESS', {
          brandId,
          total: invitations.length,
        });

        return { invitations };
      });
    }, res, 'Brand invitations retrieved', this.getRequestMeta(req));
  }

  /**
   * List invitations for authenticated manufacturer.
   */
  async listManufacturerInvitations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        const manufacturerId = this.resolveManufacturerId(req);

        this.recordPerformance(req, 'LIST_MANUFACTURER_INVITATIONS');

        const invitations = await this.connectionsServices.features.invitations.listInvitesForManufacturer(
          manufacturerId,
        );

        this.logAction(req, 'LIST_MANUFACTURER_INVITATIONS_SUCCESS', {
          manufacturerId,
          total: invitations.length,
        });

        return { invitations };
      });
    }, res, 'Manufacturer invitations retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve pending invitations for authenticated brand.
   */
  async listPendingBrandInvitations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);

        this.recordPerformance(req, 'LIST_PENDING_BRAND_INVITATIONS');

        const invitations = await this.connectionsServices.features.invitations.getPendingInvitesForBrand(brandId);

        this.logAction(req, 'LIST_PENDING_BRAND_INVITATIONS_SUCCESS', {
          brandId,
          total: invitations.length,
        });

        return { invitations };
      });
    }, res, 'Pending brand invitations retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve pending invitations for authenticated manufacturer.
   */
  async listPendingManufacturerInvitations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await this.validateManufacturerUser(req, res, async () => {
        const manufacturerId = this.resolveManufacturerId(req);

        this.recordPerformance(req, 'LIST_PENDING_MANUFACTURER_INVITATIONS');

        const invitations = await this.connectionsServices.features.invitations.getPendingInvitesForManufacturer(
          manufacturerId,
        );

        this.logAction(req, 'LIST_PENDING_MANUFACTURER_INVITATIONS_SUCCESS', {
          manufacturerId,
          total: invitations.length,
        });

        // Log what we're about to return
        this.logger.info('Controller returning pending invitations', {
          manufacturerId,
          invitationsCount: invitations.length,
          invitationsType: Array.isArray(invitations) ? 'array' : typeof invitations,
          firstInvitation: invitations.length > 0 ? {
            id: invitations[0]?.id,
            brandId: invitations[0]?.brandId,
            manufacturerId: invitations[0]?.manufacturerId
          } : null
        });

        return { invitations };
      });
    }, res, 'Pending manufacturer invitations retrieved', this.getRequestMeta(req));
  }

  /**
   * Get connection statistics for authenticated brand.
   */
  async getBrandConnectionStats(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);

        this.recordPerformance(req, 'GET_BRAND_CONNECTION_STATS');

        const stats = await this.connectionsServices.features.invitations.getConnectionStats(brandId);

        this.logAction(req, 'GET_BRAND_CONNECTION_STATS_SUCCESS', {
          brandId,
          stats,
        });

        return { stats };
      });
    }, res, 'Brand connection stats retrieved', this.getRequestMeta(req));
  }

  /**
   * Get connection statistics for authenticated manufacturer.
   */
  async getManufacturerConnectionStats(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        const manufacturerId = this.resolveManufacturerId(req);

        this.recordPerformance(req, 'GET_MANUFACTURER_CONNECTION_STATS');

        const stats = await this.connectionsServices.features.invitations.getManufacturerConnectionStats(
          manufacturerId,
        );

        this.logAction(req, 'GET_MANUFACTURER_CONNECTION_STATS_SUCCESS', {
          manufacturerId,
          stats,
        });

        return { stats };
      });
    }, res, 'Manufacturer connection stats retrieved', this.getRequestMeta(req));
  }

  /**
   * List manufacturer IDs connected to the authenticated brand.
   */
  async getConnectedManufacturers(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);

        this.recordPerformance(req, 'GET_CONNECTED_MANUFACTURERS');

        const manufacturers = await this.connectionsServices.features.invitations.getConnectedManufacturers(brandId);

        this.logAction(req, 'GET_CONNECTED_MANUFACTURERS_SUCCESS', {
          brandId,
          total: manufacturers.length,
        });

        return { manufacturerIds: manufacturers };
      });
    }, res, 'Connected manufacturers retrieved', this.getRequestMeta(req));
  }

  /**
   * List brand IDs connected to the authenticated manufacturer.
   */
  async getConnectedBrands(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await this.validateManufacturerUser(req, res, async () => {
        const manufacturerId = this.resolveManufacturerId(req);

        this.recordPerformance(req, 'GET_CONNECTED_BRANDS');

        const brands = await this.connectionsServices.features.invitations.getConnectedBrands(manufacturerId);

        this.logAction(req, 'GET_CONNECTED_BRANDS_SUCCESS', {
          manufacturerId,
          total: brands.length,
        });

        return { brandIds: brands };
      });
    }, res, 'Connected brands retrieved', this.getRequestMeta(req));
  }

  /**
   * Determine whether a brand/manufacturer pair is connected.
   */
  async checkConnectionStatus(req: ConnectionTargetRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const { brandId, manufacturerId } = this.resolveConnectionPair(req, {
          brandId: req.validatedParams?.brandId,
          manufacturerId: req.validatedParams?.manufacturerId,
        });

        this.recordPerformance(req, 'CHECK_CONNECTION_STATUS');

        const connected = await this.connectionsServices.features.invitations.areConnected(brandId, manufacturerId);

        this.logAction(req, 'CHECK_CONNECTION_STATUS_SUCCESS', {
          brandId,
          manufacturerId,
          connected,
        });

        return { connected };
      });
    }, res, 'Connection status retrieved', this.getRequestMeta(req));
  }

  /**
   * Remove connection between a brand and manufacturer (brand initiated).
   */
  async removeConnection(req: ConnectionTargetRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      return await this.validateBusinessUser(req, res, async () => {
        const brandId = this.resolveBrandId(req);
        const manufacturerId =
          req.validatedParams?.manufacturerId || req.validatedBody?.manufacturerId || this.resolveManufacturerId(req);

        this.recordPerformance(req, 'REMOVE_CONNECTION');

        await this.connectionsServices.features.invitations.removeConnection(brandId, manufacturerId);

        this.logAction(req, 'REMOVE_CONNECTION_SUCCESS', {
          brandId,
          manufacturerId,
        });

        return { removed: true };
      });
    }, res, 'Connection removed', this.getRequestMeta(req));
  }

  /**
   * Retrieve recent invitation activity for an entity.
   */
  async getRecentActivity(req: RecentActivityRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateAuth(req, res, async () => {
        const entityType = req.validatedQuery?.entityType ?? (req.userType === 'manufacturer' ? 'manufacturer' : 'brand');
        const limit = req.validatedQuery?.limit && Number.isFinite(req.validatedQuery.limit)
          ? Math.min(50, Math.max(1, Number(req.validatedQuery.limit)))
          : 10;

        const entityId =
          req.validatedQuery?.entityId ??
          (entityType === 'brand' ? this.resolveBrandId(req) : this.resolveManufacturerId(req));

        this.recordPerformance(req, 'GET_RECENT_INVITATION_ACTIVITY');

        const activity: InvitationSummary[] = await this.connectionsServices.features.invitations.getRecentActivity(
          entityId,
          entityType,
          limit,
        );

        this.logAction(req, 'GET_RECENT_INVITATION_ACTIVITY_SUCCESS', {
          entityType,
          entityId,
          limit,
          total: activity.length,
        });

        return { activity };
      });
    }, res, 'Recent invitation activity retrieved', this.getRequestMeta(req));
  }
}

export const connectionsInvitationsController = new ConnectionsInvitationsController();
