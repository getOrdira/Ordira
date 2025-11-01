import { logger } from '../../../../utils/logger';
import { SecurityEventModel, type SecurityEventDocument } from '../../../../models/deprecated/securityEvent.model';
import {
  SecurityEvent,
  SecurityEventCreateInput,
  SecurityEventType
} from '../utils/securityTypes';
import { resolveEventExpiry } from '../utils/securityHelpers';
import type { FilterQuery, Model } from 'mongoose';

/**
 * Data access layer for persisted security events.
 */
export class SecurityEventDataService {
  /**
   * Persist a security event document with calculated expiry metadata.
   */
  async createEvent(event: SecurityEventCreateInput): Promise<void> {
    try {
      const timestamp = event.timestamp ?? new Date();
      const expiresAt = event.expiresAt ?? resolveEventExpiry({ ...event, timestamp });

      const newEvent = new SecurityEventModel({
        ...event,
        timestamp,
        expiresAt
      });
      await newEvent.save();
    } catch (error) {
      logger.error('Failed to persist security event', {
        eventType: event?.eventType,
        userId: event?.userId,
        error
      });
      throw error;
    }
  }

  /**
   * Retrieve the most recent events for a user, ordered by timestamp desc.
   */
  async findRecentEventsByUser(userId: string, limit: number): Promise<SecurityEvent[]> {
    const events = await (SecurityEventModel as Model<SecurityEventDocument>)
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return events as unknown as SecurityEvent[];
  }

  /**
   * Retrieve user events that occurred after a specific date.
   */
  async findEventsByUserSince(userId: string, startDate: Date): Promise<SecurityEvent[]> {
    const events = await (SecurityEventModel as Model<SecurityEventDocument>)
      .find({ userId, timestamp: { $gte: startDate } })
      .sort({ timestamp: -1 })
      .lean();

    return events as unknown as SecurityEvent[];
  }

  /**
   * Retrieve all events across the platform after a specific date.
   */
  async findEventsSince(startDate: Date): Promise<SecurityEvent[]> {
    const events = await (SecurityEventModel as Model<SecurityEventDocument>)
      .find({ timestamp: { $gte: startDate } })
      .sort({ timestamp: -1 })
      .lean();

    return events as unknown as SecurityEvent[];
  }

  /**
   * Count events matching an arbitrary MongoDB query.
   */
  async countEvents(query: Record<string, unknown>): Promise<number> {
    return (SecurityEventModel as Model<SecurityEventDocument>).countDocuments(query);
  }

  /**
   * Count failed authentication attempts for a user after the provided date.
   */
  async countFailedLogins(userId: string, since: Date): Promise<number> {
    return this.countEvents({
      userId,
      eventType: SecurityEventType.LOGIN_FAILED,
      timestamp: { $gte: since }
    });
  }

  /**
   * Determine the unique IP addresses used by a user in the provided window.
   */
  async distinctIpAddresses(userId: string, since: Date): Promise<string[]> {
    const result = await SecurityEventModel.distinct('ipAddress', {
      userId,
      timestamp: { $gte: since }
    });
    return result;
  }
}

export const securityEventDataService = new SecurityEventDataService();



