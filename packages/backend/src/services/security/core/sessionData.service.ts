import { logger } from '../../../utils/logger';
import { ActiveSessionModel, type ActiveSessionDocument } from '../../../models/activeSession.model';
import type { SessionInfo, SessionCreateInput } from '../utilities/securityTypes';
import type { FilterQuery, Model } from 'mongoose';

/**
 * Data access layer for security session documents.
 */
export class SessionDataService {
  /**
   * Create a new active session record.
   */
  async createSession(session: SessionCreateInput & { sessionId: string }): Promise<void> {
    try {
      const newSession = new ActiveSessionModel({
        ...session,
        createdAt: session.createdAt ?? new Date(),
        lastActivity: session.lastActivity ?? new Date()
      });
      await newSession.save();
    } catch (error) {
      logger.error('Failed to create active session', {
        sessionId: session.sessionId,
        userId: session.userId,
        error
      });
      throw error;
    }
  }

  /**
   * Find an active session by its identifier.
   */
  async findActiveSessionById(sessionId: string): Promise<SessionInfo | null> {
    const session = await (ActiveSessionModel as Model<ActiveSessionDocument>).findOne({ sessionId, isActive: true }).lean();
    return session as unknown as SessionInfo | null;
  }

  /**
   * Update the last-activity timestamp for a session.
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await ActiveSessionModel.updateOne(
      { sessionId, isActive: true },
      { $set: { lastActivity: new Date() } }
    );
  }

  /**
   * Deactivate a single session.
   */
  async deactivateSession(sessionId: string): Promise<void> {
    await ActiveSessionModel.updateOne({ sessionId }, { $set: { isActive: false } });
  }

  /**
   * Deactivate sessions matching the provided query.
   */
  async deactivateSessions(query: Record<string, unknown>): Promise<number> {
    const result = await ActiveSessionModel.updateMany(query, { $set: { isActive: false } });
    return result.modifiedCount ?? 0;
  }

  /**
   * Retrieve all active sessions for a user ordered by activity.
   */
  async findActiveSessionsByUser(userId: string): Promise<SessionInfo[]> {
    const sessions = await (ActiveSessionModel as Model<ActiveSessionDocument>)
      .find({ userId, isActive: true })
      .sort({ lastActivity: -1 })
      .lean();

    return sessions as unknown as SessionInfo[];
  }

  /**
   * Mark sessions that expired before the reference date as inactive.
   */
  async markExpiredSessionsInactive(referenceDate: Date): Promise<number> {
    const result = await ActiveSessionModel.updateMany(
      { expiresAt: { $lt: referenceDate }, isActive: true },
      { $set: { isActive: false } }
    );

    return result.modifiedCount ?? 0;
  }

  /**
   * Count sessions created since the provided timestamp.
   */
  async countRecentSessions(userId: string, since: Date): Promise<number> {
    return (ActiveSessionModel as Model<ActiveSessionDocument>).countDocuments({ userId, createdAt: { $gte: since } });
  }
}

export const sessionDataService = new SessionDataService();
