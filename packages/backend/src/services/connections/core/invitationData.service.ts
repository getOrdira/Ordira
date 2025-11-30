// src/services/connections/core/invitationData.service.ts

import { Invitation, IInvitation } from '../../../models/infrastructure/invitation.model';
import { Types } from 'mongoose';
import { logger } from '../../../utils/logger';

/**
 * Core data access service for Invitations
 * Handles all direct database operations for invitation documents
 */
export class InvitationDataService {
  /**
   * Create a new invitation
   */
  async create(data: {
    brand: string | Types.ObjectId;
    manufacturer: string | Types.ObjectId;
    invitationType?: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
    message?: string;
    terms?: {
      proposedCommission?: number;
      minimumOrderQuantity?: number;
      deliveryTimeframe?: string;
      specialRequirements?: string[];
    };
    expiresAt?: Date;
  }): Promise<IInvitation> {
    try {
      const invitation = await Invitation.create({
        brand: data.brand,
        manufacturer: data.manufacturer,
        status: 'pending',
        invitationType: data.invitationType || 'collaboration',
        message: data.message,
        terms: data.terms,
        expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
      });

      logger.info('Invitation created', {
        invitationId: invitation._id,
        brandId: data.brand,
        manufacturerId: data.manufacturer,
        type: invitation.invitationType
      });

      return invitation;
    } catch (error) {
      logger.error('Failed to create invitation', { data }, error as Error);
      throw error;
    }
  }

  /**
   * Find invitation by ID
   */
  async findById(invitationId: string, populate?: boolean): Promise<IInvitation | null> {
    try {
      let query: any = Invitation.findById(invitationId);

      if (populate) {
        query = query
          .populate('manufacturer', 'name email')
          .populate('brand', 'businessName email');  // Now populates Business directly
      }

      return await query.exec() as IInvitation;
    } catch (error) {
      logger.error('Failed to find invitation by ID', { invitationId }, error as Error);
      throw error;
    }
  }

  /**
   * Find invitations for a brand
   */
  async findByBrand(brandId: string, filters?: {
    status?: string;
    invitationType?: string;
    limit?: number;
  }): Promise<IInvitation[]> {
    try {
      const query: any = { brand: brandId };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.invitationType) {
        query.invitationType = filters.invitationType;
      }

      let dbQuery = Invitation.find(query)
        .populate('manufacturer', 'name email')
        .sort({ createdAt: -1 });

      if (filters?.limit) {
        dbQuery = dbQuery.limit(filters.limit);
      }

      return await dbQuery.exec();
    } catch (error) {
      logger.error('Failed to find invitations by brand', { brandId, filters }, error as Error);
      throw error;
    }
  }

  /**
   * Find invitations for a manufacturer
   */
  async findByManufacturer(manufacturerId: string, filters?: {
    status?: string;
    invitationType?: string;
    limit?: number;
  }): Promise<IInvitation[]> {
    try {
      const query: any = { manufacturer: manufacturerId };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.invitationType) {
        query.invitationType = filters.invitationType;
      }

      let dbQuery = Invitation.find(query)
        .populate('brand', '_id businessName email')  // Include _id for ID extraction in mapping
        .sort({ createdAt: -1 });

      if (filters?.limit) {
        dbQuery = dbQuery.limit(filters.limit);
      }

      return await dbQuery.exec();
    } catch (error) {
      logger.error('Failed to find invitations by manufacturer', { manufacturerId, filters }, error as Error);
      throw error;
    }
  }

  /**
   * Find a specific invitation between brand and manufacturer
   */
  async findByBrandAndManufacturer(
    brandId: string,
    manufacturerId: string,
    status?: string
  ): Promise<IInvitation | null> {
    try {
      const query: any = {
        brand: brandId,
        manufacturer: manufacturerId
      };

      if (status) {
        query.status = status;
      }

      return await Invitation.findOne(query).exec();
    } catch (error) {
      logger.error('Failed to find invitation by brand and manufacturer',
        { brandId, manufacturerId, status }, error as Error);
      throw error;
    }
  }

  /**
   * Update invitation status
   */
  async updateStatus(
    invitationId: string,
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected',
    additionalData?: {
      responseMessage?: string;
      counterOffer?: any;
    }
  ): Promise<IInvitation | null> {
    try {
      const invitation = await Invitation.findById(invitationId);

      if (!invitation) {
        return null;
      }

      invitation.status = status;
      invitation.respondedAt = new Date();

      if (additionalData?.responseMessage) {
        invitation.responseMessage = additionalData.responseMessage;
      }

      if (additionalData?.counterOffer) {
        invitation.counterOffer = additionalData.counterOffer;
      }

      await invitation.save();

      const getEntityIdForLog = (entity: any): string => {
        if (!entity) return 'null';
        if (entity instanceof Types.ObjectId) return entity.toString();
        if ((entity as any)?._id) return (entity as any)._id.toString();
        return String(entity);
      };

      logger.info('Invitation status updated', {
        invitationId,
        newStatus: status,
        brandId: getEntityIdForLog(invitation.brand),
        manufacturerId: getEntityIdForLog(invitation.manufacturer)
      });

      return invitation;
    } catch (error) {
      logger.error('Failed to update invitation status',
        { invitationId, status }, error as Error);
      throw error;
    }
  }

  /**
   * Get invitation statistics for a brand
   */
  async getStatsByBrand(brandId: string): Promise<{
    totalConnections: number;
    pendingInvitations: number;
    acceptedInvitations: number;
    declinedInvitations: number;
  }> {
    try {
      const [total, pending, accepted, declined] = await Promise.all([
        Invitation.countDocuments({ brand: brandId }),
        Invitation.countDocuments({ brand: brandId, status: 'pending' }),
        Invitation.countDocuments({ brand: brandId, status: 'accepted' }),
        Invitation.countDocuments({ brand: brandId, status: 'declined' })
      ]);

      return {
        totalConnections: total,
        pendingInvitations: pending,
        acceptedInvitations: accepted,
        declinedInvitations: declined
      };
    } catch (error) {
      logger.error('Failed to get invitation stats for brand', { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get invitation statistics for a manufacturer
   */
  async getStatsByManufacturer(manufacturerId: string): Promise<{
    totalConnections: number;
    pendingInvitations: number;
    acceptedInvitations: number;
    declinedInvitations: number;
  }> {
    try {
      const [total, pending, accepted, declined] = await Promise.all([
        Invitation.countDocuments({ manufacturer: manufacturerId }),
        Invitation.countDocuments({ manufacturer: manufacturerId, status: 'pending' }),
        Invitation.countDocuments({ manufacturer: manufacturerId, status: 'accepted' }),
        Invitation.countDocuments({
          manufacturer: manufacturerId,
          status: { $in: ['declined', 'cancelled', 'expired', 'disconnected'] }
        })
      ]);

      return {
        totalConnections: total,
        pendingInvitations: pending,
        acceptedInvitations: accepted,
        declinedInvitations: declined
      };
    } catch (error) {
      logger.error('Failed to get invitation stats for manufacturer',
        { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Mark expired invitations (for cron job)
   */
  async markExpired(): Promise<number> {
    try {
      const result = await Invitation.updateMany(
        {
          status: 'pending',
          expiresAt: { $lte: new Date() }
        },
        {
          $set: {
            status: 'expired',
            respondedAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Marked ${result.modifiedCount} invitations as expired`);
      }

      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to mark expired invitations', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get recent invitation activity
   */
  async getRecentActivity(
    entityId: string,
    entityType: 'brand' | 'manufacturer',
    limit: number = 10
  ): Promise<IInvitation[]> {
    try {
      const matchField = entityType === 'brand' ? 'brand' : 'manufacturer';
      const populateField = entityType === 'brand' ? 'manufacturer' : 'brand';

      return await Invitation.find({ [matchField]: entityId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate(populateField)
        .exec();
    } catch (error) {
      logger.error('Failed to get recent invitation activity',
        { entityId, entityType, limit }, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const invitationDataService = new InvitationDataService();

