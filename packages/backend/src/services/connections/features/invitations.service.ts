// src/services/connections/features/invitations.service.ts
import { Types } from 'mongoose';
import { NotificationCategory, NotificationEventType, NotificationPriority, eventHandlerService } from '../../notifications';

import { invitationDataService } from '../core/invitationData.service';
import { connectionDataService } from '../core/connectionData.service';
import { IInvitation } from '../../../models/infrastructure/invitation.model';
import { logger } from '../../../utils/logger';
import { connectionHelpersService } from '../utils/connectionHelpers.service';

export interface InvitationSummary {
  id: string;
  brandId: string;
  manufacturerId: string;
  brandName?: string;
  manufacturerName?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected';
  invitationType?: string;
  createdAt: Date;
  respondedAt?: Date;
  expiresAt?: Date;
  timeRemaining?: number | null;
  urgencyLevel?: string;
}

export interface ConnectionStats {
  totalConnections: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  declinedInvitations: number;
}

export interface BulkInviteResult {
  successful: string[];
  failed: Array<{ manufacturerId: string; error: string }>;
}

/**
 * High-level Invitations Feature Service
 * Orchestrates invitation flows, handles business logic, and coordinates with other services
 */
export class InvitationsService {
  /**
   * Send an invitation from brand to manufacturer
   */
  async sendInvite(
    brandId: string,
    manufacturerId: string,
    options?: {
      message?: string;
      invitationType?: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
      terms?: any;
    }
  ): Promise<IInvitation> {
    try {
      // Check for duplicate pending invite
      const existingInvite = await invitationDataService.findByBrandAndManufacturer(
        brandId,
        manufacturerId,
        'pending'
      );

      if (existingInvite) {
        throw { statusCode: 409, message: 'Invitation already pending.' };
      }

      // Check if already connected
      const alreadyConnected = await connectionDataService.areConnected(brandId, manufacturerId);
      if (alreadyConnected) {
        throw { statusCode: 409, message: 'Brand and manufacturer are already connected.' };
      }

      // Create new invitation
      const invite = await invitationDataService.create({
        brand: brandId,
        manufacturer: manufacturerId,
        message: connectionHelpersService.normalizeMessage(options?.message),
        invitationType: options?.invitationType,
        terms: connectionHelpersService.normalizeTerms(options?.terms)
      });

      // Notify the manufacturer (don't block on notification failure)
      eventHandlerService.handle({
        type: NotificationEventType.ConnectionRequested,
        recipient: { manufacturerId },
        payload: {
          brandId,
          manufacturerId,
          invitationId: invite._id.toString(),
          message: options?.message,
        },
        metadata: {
          category: NotificationCategory.Connection,
          priority: NotificationPriority.Medium,
          title: 'New connection invitation',
          message: options?.message ?? 'A brand invited you to connect.',
          actionUrl: `/manufacturer/connections/${brandId}`,
        },
      }).catch((notificationError) => {
        logger.warn('Failed to send connection invitation notification', {
          brandId,
          manufacturerId,
          invitationId: invite._id.toString(),
          error: notificationError
        });
      });
      return invite;
    } catch (error) {
      logger.error('Failed to send invitation',
        { brandId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * List all invitations for a brand
   */
  async listInvitesForBrand(brandId: string): Promise<InvitationSummary[]> {
    try {
      const invites = await invitationDataService.findByBrand(brandId);

      return invites
        .map(invite => {
          try {
            return this.mapToSummary(invite);
          } catch (mapError) {
            logger.error('Failed to map invitation to summary', {
              invitationId: invite?._id?.toString(),
              brandId,
              error: mapError
            });
            return null; // Will be filtered out
          }
        })
        .filter((summary): summary is InvitationSummary => summary !== null);
    } catch (error) {
      logger.error('Failed to list invitations for brand', { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * List all invitations for a manufacturer
   */
  async listInvitesForManufacturer(manufacturerId: string): Promise<InvitationSummary[]> {
    try {
      const invites = await invitationDataService.findByManufacturer(manufacturerId);

      return invites
        .map(invite => {
          try {
            return this.mapToSummary(invite);
          } catch (mapError) {
            logger.error('Failed to map invitation to summary', {
              invitationId: invite?._id?.toString(),
              manufacturerId,
              error: mapError
            });
            return null; // Will be filtered out
          }
        })
        .filter((summary): summary is InvitationSummary => summary !== null);
    } catch (error) {
      logger.error('Failed to list invitations for manufacturer', { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a brand
   */
  async getPendingInvitesForBrand(brandId: string): Promise<InvitationSummary[]> {
    try {
      const invites = await invitationDataService.findByBrand(brandId, { status: 'pending' });
      return invites
        .map(invite => {
          try {
            return this.mapToSummary(invite);
          } catch (mapError) {
            logger.error('Failed to map invitation to summary', {
              invitationId: invite?._id?.toString(),
              brandId,
              error: mapError
            });
            // Return a minimal summary to prevent breaking the entire list
            return {
              id: invite?._id?.toString() || 'unknown',
              brandId: invite?.brand ? (invite.brand instanceof Types.ObjectId ? invite.brand.toString() : String(invite.brand)) : '',
              manufacturerId: invite?.manufacturer ? (invite.manufacturer instanceof Types.ObjectId ? invite.manufacturer.toString() : String(invite.manufacturer)) : '',
              status: invite?.status || 'unknown',
              invitationType: invite?.invitationType || 'custom',
              createdAt: invite?.createdAt || new Date(),
              respondedAt: invite?.respondedAt,
              expiresAt: invite?.expiresAt,
              timeRemaining: null,
              urgencyLevel: 'none' as const
            } as InvitationSummary;
          }
        })
        .filter(summary => summary.brandId && summary.manufacturerId); // Filter out invalid summaries
    } catch (error) {
      logger.error('Failed to get pending invitations for brand', { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a manufacturer
   */
  async getPendingInvitesForManufacturer(manufacturerId: string): Promise<InvitationSummary[]> {
    try {
      const invites = await invitationDataService.findByManufacturer(manufacturerId, { status: 'pending' });
      return invites
        .map(invite => {
          try {
            return this.mapToSummary(invite);
          } catch (mapError) {
            logger.error('Failed to map invitation to summary', {
              invitationId: invite?._id?.toString(),
              manufacturerId,
              error: mapError
            });
            // Return a minimal summary to prevent breaking the entire list
            return {
              id: invite?._id?.toString() || 'unknown',
              brandId: invite?.brand ? (invite.brand instanceof Types.ObjectId ? invite.brand.toString() : String(invite.brand)) : '',
              manufacturerId: invite?.manufacturer ? (invite.manufacturer instanceof Types.ObjectId ? invite.manufacturer.toString() : String(invite.manufacturer)) : '',
              status: invite?.status || 'unknown',
              invitationType: invite?.invitationType || 'custom',
              createdAt: invite?.createdAt || new Date(),
              respondedAt: invite?.respondedAt,
              expiresAt: invite?.expiresAt,
              timeRemaining: null,
              urgencyLevel: 'none' as const
            } as InvitationSummary;
          }
        })
        .filter(summary => summary.brandId && summary.manufacturerId); // Filter out invalid summaries
    } catch (error) {
      logger.error('Failed to get pending invitations for manufacturer', { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Manufacturer responds to an invitation (accept/decline)
   */
  async respondInvite(
    inviteId: string,
    accept: boolean,
    manufacturerId: string,
    message?: string
  ): Promise<IInvitation> {
    try {
      const invite = await invitationDataService.findById(inviteId);

      if (!invite) {
        throw { statusCode: 404, message: 'Invitation not found.' };
      }

      // Helper to extract ID from ObjectId or populated document
      const getEntityId = (entity: any): string => {
        if (!entity) return '';
        if (entity instanceof Types.ObjectId) return entity.toString();
        if (entity._id) return entity._id.toString(); // Populated document
        if (typeof entity === 'string') return entity;
        return '';
      };

      const inviteManufacturerId = getEntityId(invite.manufacturer);
      if (inviteManufacturerId !== manufacturerId) {
        throw { statusCode: 403, message: 'Not authorized to respond to this invite.' };
      }

      if (invite.status !== 'pending') {
        throw { statusCode: 400, message: 'Invitation has already been responded to.' };
      }

      // Update invitation status
      const updatedInvite = await invitationDataService.updateStatus(
        inviteId,
        accept ? 'accepted' : 'declined',
        { responseMessage: connectionHelpersService.normalizeMessage(message) }
      );

      if (!updatedInvite) {
        throw { statusCode: 500, message: 'Failed to update invitation.' };
      }

      if (accept) {
        // Extract brand ID safely
        const brandId = getEntityId(invite.brand);
        
        // Create bidirectional connection
        await connectionDataService.createConnection(
          brandId,
          manufacturerId
        );

        // Notify the brand that their invite was accepted
        await eventHandlerService.handle({
          type: NotificationEventType.ConnectionAccepted,
          recipient: { businessId: brandId },
          payload: {
            manufacturerId,
            brandId,
            invitationId: invite._id.toString(),
            responseMessage: message,
          },
          metadata: {
            category: NotificationCategory.Connection,
            priority: NotificationPriority.Medium,
            title: 'Connection invitation accepted',
            message: 'Your connection invitation was accepted.',
            actionUrl: `/brand/connections/${manufacturerId}`,
          },
        });
      }
      else {
        const brandId = getEntityId(invite.brand);
        await eventHandlerService.handle({
          type: NotificationEventType.ConnectionDeclined,
          recipient: { businessId: brandId },
          payload: {
            manufacturerId,
            brandId,
            invitationId: invite._id.toString(),
            responseMessage: message,
          },
          metadata: {
            category: NotificationCategory.Connection,
            priority: NotificationPriority.Medium,
            title: 'Connection invitation declined',
            message: message ?? 'Your connection invitation was declined.',
            actionUrl: `/brand/connections/${manufacturerId}`,
          },
        });
      }

      return updatedInvite;
    } catch (error) {
      logger.error('Failed to respond to invitation',
        { inviteId, accept, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Brand cancels a pending invitation
   */
  async cancelInvite(inviteId: string, brandId: string): Promise<void> {
    try {
      const invite = await invitationDataService.findById(inviteId);

      if (!invite) {
        throw { statusCode: 404, message: 'Invitation not found.' };
      }

      if (invite.brand.toString() !== brandId) {
        throw { statusCode: 403, message: 'Not authorized to cancel this invite.' };
      }

      if (invite.status !== 'pending') {
        throw { statusCode: 400, message: 'Can only cancel pending invitations.' };
      }

      await invitationDataService.updateStatus(inviteId, 'cancelled');
    } catch (error) {
      logger.error('Failed to cancel invitation', { inviteId, brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get connection statistics for a brand
   */
  async getConnectionStats(brandId: string): Promise<ConnectionStats> {
    try {
      return await invitationDataService.getStatsByBrand(brandId);
    } catch (error) {
      logger.error('Failed to get connection stats for brand', { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get connection statistics for a manufacturer
   */
  async getManufacturerConnectionStats(manufacturerId: string): Promise<ConnectionStats> {
    try {
      return await invitationDataService.getStatsByManufacturer(manufacturerId);
    } catch (error) {
      logger.error('Failed to get connection stats for manufacturer', { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Get all connected manufacturers for a brand
   */
  async getConnectedManufacturers(brandId: string): Promise<string[]> {
    try {
      return await connectionDataService.getConnectedManufacturers(brandId);
    } catch (error) {
      logger.error('Failed to get connected manufacturers', { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get all connected brands for a manufacturer
   */
  async getConnectedBrands(manufacturerId: string): Promise<string[]> {
    try {
      return await connectionDataService.getConnectedBrands(manufacturerId);
    } catch (error) {
      logger.error('Failed to get connected brands', { manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Check if brand and manufacturer are connected
   */
  async areConnected(brandId: string, manufacturerId: string): Promise<boolean> {
    try {
      return await connectionDataService.areConnected(brandId, manufacturerId);
    } catch (error) {
      logger.error('Failed to check connection status',
        { brandId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Remove connection between brand and manufacturer
   */
  async removeConnection(brandId: string, manufacturerId: string): Promise<void> {
    try {
      await connectionDataService.removeConnection(brandId, manufacturerId);
    } catch (error) {
      logger.error('Failed to remove connection',
        { brandId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(inviteId: string): Promise<IInvitation | null> {
    try {
      return await invitationDataService.findById(inviteId, true);
    } catch (error) {
      logger.error('Failed to get invitation by ID', { inviteId }, error as Error);
      throw error;
    }
  }

  /**
   * Send bulk invitations from a brand to multiple manufacturers
   */
  async bulkInvite(
    brandId: string,
    manufacturerIds: string[],
    options?: {
      message?: string;
      invitationType?: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
    }
  ): Promise<BulkInviteResult> {
    const successful: string[] = [];
    const failed: Array<{ manufacturerId: string; error: string }> = [];

    for (const manufacturerId of manufacturerIds) {
      try {
        await this.sendInvite(brandId, manufacturerId, options);
        successful.push(manufacturerId);
      } catch (error: any) {
        failed.push({
          manufacturerId,
          error: error.message || 'Unknown error'
        });
      }
    }

    logger.info('Bulk invitation completed', {
      brandId,
      successful: successful.length,
      failed: failed.length
    });

    return { successful, failed };
  }

  /**
   * Get recent invitation activity
   */
  async getRecentActivity(
    entityId: string,
    entityType: 'brand' | 'manufacturer',
    limit: number = 10
  ): Promise<InvitationSummary[]> {
    try {
      const invites = await invitationDataService.getRecentActivity(entityId, entityType, limit);
      return invites.map(invite => this.mapToSummary(invite));
    } catch (error) {
      logger.error('Failed to get recent activity',
        { entityId, entityType, limit }, error as Error);
      throw error;
    }
  }

  /**
   * Helper: Map invitation document to summary
   */
  private mapToSummary(invite: IInvitation): InvitationSummary {
    return connectionHelpersService.mapInvitationToSummary(invite);
  }
}

// Export singleton instance
export const invitationsService = new InvitationsService();
















