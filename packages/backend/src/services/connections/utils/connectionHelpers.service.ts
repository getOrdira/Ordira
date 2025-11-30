// src/services/connections/utils/connectionHelpers.service.ts

import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import type { IInvitation } from '../../../models/infrastructure/invitation.model';
import type { InvitationSummary } from '../features/invitations.service';
import { logger } from '../../../utils/logger';

export type InvitationStatus = IInvitation['status'];

export interface NormalizedTerms {
  proposedCommission?: number;
  minimumOrderQuantity?: number;
  deliveryTimeframe?: string;
  specialRequirements?: string[];
}

export interface NotificationContext {
  invitationId: string;
  brandId: string;
  manufacturerId: string;
  status: InvitationStatus;
  invitationType: IInvitation['invitationType'];
  expiresAt?: Date;
  respondedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Helper utilities for the connections module.
 * Provides shared calculations, formatting helpers, and guard rails that are
 * reused across feature services.
 */
export class ConnectionHelpersService {
  /**
   * Calculate the time remaining (in hours) before an invitation expires.
   */
  calculateTimeRemaining(expiresAt: Date | undefined, status: InvitationStatus): number | null {
    if (!expiresAt || status !== 'pending') {
      return null;
    }

    const diffMs = expiresAt.getTime() - Date.now();
    if (diffMs <= 0) {
      return 0;
    }

    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * Determine urgency level based on time remaining.
   */
  determineUrgency(status: InvitationStatus, timeRemaining: number | null): 'high' | 'medium' | 'low' | 'none' {
    if (status !== 'pending' || timeRemaining === null) {
      return 'none';
    }

    if (timeRemaining <= 24) {
      return 'high';
    }

    if (timeRemaining <= 72) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Map an invitation document to the public summary structure used by APIs.
   */
  mapInvitationToSummary(invite: IInvitation): InvitationSummary {
    const timeRemaining = this.calculateTimeRemaining(invite.expiresAt, invite.status);
    const urgencyLevel = this.determineUrgency(invite.status, timeRemaining);

    // Handle null/undefined brand and manufacturer references
    // Support both ObjectId and populated documents
    const getEntityId = (entity: any): string => {
      if (!entity) {
        return '';
      }
      // First check if it's an ObjectId directly (most common case for non-populated refs)
      if (entity instanceof Types.ObjectId) {
        return entity.toString();
      }
      // If it's already a string and valid ObjectId format, return it
      if (typeof entity === 'string' && entity.match(/^[0-9a-fA-F]{24}$/)) {
        return entity;
      }
      // For Mongoose documents, try accessing id first (Mongoose provides this as a getter)
      // This works for both populated and non-populated documents
      try {
        if ((entity as any)?.id !== undefined) {
          const id = String((entity as any).id);
          if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            return id;
          }
        }
      } catch (e) {
        // id getter might throw, continue to next check
      }
      // Check for populated Mongoose document - _id is usually accessible directly
      if ((entity as any)?._id) {
        const idValue = (entity as any)._id;
        const id = idValue instanceof Types.ObjectId ? idValue.toString() : String(idValue);
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
          return id;
        }
      }
      // Check if entity itself is an object with toString method (ObjectId-like)
      if (typeof entity.toString === 'function' && entity.toString !== Object.prototype.toString) {
        try {
          const id = entity.toString();
          if (id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
            return id;
          }
        } catch (e) {
          // toString might throw, continue
        }
      }
      return '';
    };

    const brandId = getEntityId(invite.brand);
    const manufacturerId = getEntityId(invite.manufacturer);

    // Log if IDs are empty to help debug - use info level to ensure it shows up
    if (!brandId || !manufacturerId) {
      logger.info('mapInvitationToSummary: Empty IDs extracted - DEBUG', {
        invitationId: invite._id?.toString(),
        brandId,
        manufacturerId,
        brandType: typeof invite.brand,
        brandIsObjectId: invite.brand instanceof Types.ObjectId,
        manufacturerType: typeof invite.manufacturer,
        manufacturerIsObjectId: invite.manufacturer instanceof Types.ObjectId,
        brandValue: invite.brand ? (invite.brand instanceof Types.ObjectId ? invite.brand.toString() : String(invite.brand)) : 'null',
        manufacturerValue: invite.manufacturer ? (invite.manufacturer instanceof Types.ObjectId ? invite.manufacturer.toString() : String(invite.manufacturer)) : 'null',
        brandHasId: !!(invite.brand as any)?.id,
        brandHas_id: !!(invite.brand as any)?._id,
        manufacturerHasId: !!(invite.manufacturer as any)?.id,
        manufacturerHas_id: !!(invite.manufacturer as any)?._id
      });
    }

    // Extract names from populated documents
    const brandName = (invite as any)?.brand?.businessName || (invite as any)?.brand?.business?.businessName;
    const manufacturerName = (invite as any)?.manufacturer?.name;

    return {
      id: invite._id.toString(),
      brandId,
      manufacturerId,
      brandName,
      manufacturerName,
      status: invite.status,
      invitationType: invite.invitationType,
      createdAt: invite.createdAt,
      respondedAt: invite.respondedAt,
      expiresAt: invite.expiresAt,
      timeRemaining,
      urgencyLevel
    };
  }

  /**
   * Normalize invitation message by trimming and enforcing the character limit.
   */
  normalizeMessage(message?: string): string | undefined {
    if (!message) {
      return undefined;
    }

    const trimmed = message.trim();
    return trimmed.length > 1000 ? `${trimmed.slice(0, 997)}...` : trimmed;
  }

  /**
   * Normalize terms object by removing empty values and clamping ranges.
   */
  normalizeTerms(terms?: NormalizedTerms | null): NormalizedTerms | undefined {
    if (!terms) {
      return undefined;
    }

    const normalized: NormalizedTerms = {};

    if (typeof terms.proposedCommission === 'number') {
      normalized.proposedCommission = Math.min(Math.max(terms.proposedCommission, 0), 100);
    }

    if (typeof terms.minimumOrderQuantity === 'number') {
      normalized.minimumOrderQuantity = Math.max(Math.floor(terms.minimumOrderQuantity), 1);
    }

    if (terms.deliveryTimeframe) {
      normalized.deliveryTimeframe = terms.deliveryTimeframe.trim();
    }

    if (Array.isArray(terms.specialRequirements)) {
      const cleaned = terms.specialRequirements
        .map(req => req.trim())
        .filter(req => req.length > 0);

      if (cleaned.length) {
        normalized.specialRequirements = Array.from(new Set(cleaned)).slice(0, 10);
      }
    }

    return Object.keys(normalized).length ? normalized : undefined;
  }

  /**
   * Generate a default expiration date (30 days from now by default).
   */
  generateExpirationDate(days: number = 30): Date {
    const now = Date.now();
    return new Date(now + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Validate whether a status transition is allowed.
   */
  validateStatusTransition(current: InvitationStatus, next: InvitationStatus): boolean {
    if (current === next) {
      return true;
    }

    const transitions: Record<InvitationStatus, InvitationStatus[]> = {
      pending: ['accepted', 'declined', 'expired', 'cancelled'],
      accepted: ['disconnected', 'cancelled'],
      declined: [],
      expired: [],
      cancelled: [],
      disconnected: []
    };

    return transitions[current]?.includes(next) ?? false;
  }

  /**
   * Generate a cryptographically secure invitation token.
   */
  generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Build notification payload used by the notification service.
   */
  buildNotificationContext(invite: IInvitation, metadata?: Record<string, unknown>): NotificationContext {
    // Handle null/undefined brand and manufacturer references
    // Support both ObjectId and populated documents
    const getEntityId = (entity: any): string => {
      if (!entity) return '';
      if (entity instanceof Types.ObjectId) return entity.toString();
      // Check for populated document with _id
      if (entity._id) {
        return entity._id instanceof Types.ObjectId ? entity._id.toString() : String(entity._id);
      }
      // Check if entity itself is an object with toString method (ObjectId-like)
      if (typeof entity.toString === 'function' && entity.toString().match(/^[0-9a-fA-F]{24}$/)) {
        return entity.toString();
      }
      if (typeof entity === 'string') return entity;
      return '';
    };

    const brandId = getEntityId(invite.brand);
    const manufacturerId = getEntityId(invite.manufacturer);

    return {
      invitationId: invite._id.toString(),
      brandId,
      manufacturerId,
      status: invite.status,
      invitationType: invite.invitationType,
      expiresAt: invite.expiresAt,
      respondedAt: invite.respondedAt,
      metadata
    };
  }

  /**
   * Convert a string or ObjectId-like value into a valid ObjectId.
   */
  ensureObjectId(value: string | Types.ObjectId): Types.ObjectId {
    if (value instanceof Types.ObjectId) {
      return value;
    }

    if (!Types.ObjectId.isValid(value)) {
      throw new Error('Invalid identifier provided');
    }

    return new Types.ObjectId(value);
  }
}

export const connectionHelpersService = new ConnectionHelpersService();

