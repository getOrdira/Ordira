import { logger } from '../../../../utils/logger';
import { UtilsService } from '../../../utils/utils.service';
import { sessionDataService, SessionDataService } from '../core/sessionData.service';
import { securityValidationService, SecurityValidationService } from '../validation/securityValidation.service';
import { securityEventLoggerService, SecurityEventLoggerService } from './securityEventLogger.service';
import {
  SecurityActorType,
  SecurityEventType,
  SecuritySeverity,
  SessionCreateInput,
  SessionInfo
} from '../utils/securityTypes';

interface RevokeSessionContext {
  reason?: string;
}

interface RevokeAllContext extends RevokeSessionContext {
  excludeSessionId?: string;
}

/**
 * Feature layer orchestrating active session lifecycle operations.
 */
export class SessionManagementService {
  constructor(
    private readonly sessions: SessionDataService = sessionDataService,
    private readonly validation: SecurityValidationService = securityValidationService,
    private readonly events: SecurityEventLoggerService = securityEventLoggerService
  ) {}

  /**
   * Create a new session and return the generated identifier.
   */
  async createSession(input: SessionCreateInput): Promise<string> {
    const normalized = this.validation.validateSessionCreateInput(input);
    const sessionId = input.sessionId?.toString().trim() || UtilsService.generateSecureId();

    await this.sessions.createSession({
      ...normalized,
      sessionId,
      createdAt: normalized.createdAt ?? new Date(),
      lastActivity: normalized.lastActivity ?? new Date(),
      isActive: normalized.isActive ?? true
    });

    return sessionId;
  }

  /**
   * Update the last activity timestamp for a session.
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessions.updateSessionActivity(sessionId);
  }

  /**
   * Revoke a single session and log the corresponding security event.
   */
  async revokeSession(
    sessionId: string,
    context: RevokeSessionContext = {}
  ): Promise<void> {
    const session = await this.sessions.findActiveSessionById(sessionId);
    if (!session) {
      return;
    }

    await this.sessions.deactivateSession(sessionId);

    await this.events.logEvent({
      eventType: SecurityEventType.SESSION_REVOKED,
      userId: session.userId,
      userType: session.userType,
      severity: SecuritySeverity.MEDIUM,
      success: true,
      sessionId,
      additionalData: { reason: context.reason ?? 'manual_revoke' }
    });
  }

  /**
   * Revoke all active sessions for a user and log the aggregate action.
   */
  async revokeAllSessions(
    userId: string,
    userType: SecurityActorType = 'business',
    context: RevokeAllContext = {}
  ): Promise<number> {
    const query: Record<string, unknown> = { userId, isActive: true };
    if (context.excludeSessionId) {
      query.sessionId = { $ne: context.excludeSessionId };
    }

    const revokedCount = await this.sessions.deactivateSessions(query);

    if (revokedCount > 0) {
      await this.events.logEvent({
        eventType: SecurityEventType.ALL_SESSIONS_REVOKED,
        userId,
        userType,
        severity: SecuritySeverity.HIGH,
        success: true,
        additionalData: {
          revokedCount,
          reason: context.reason ?? 'security_event',
          excludeSessionId: context.excludeSessionId ?? 'none'
        }
      });
    }

    return revokedCount;
  }

  /**
   * Retrieve all active sessions for a user.
   */
  async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    return this.sessions.findActiveSessionsByUser(userId);
  }

  /**
   * Deactivate expired sessions and return the number updated.
   */
  async cleanupExpiredSessions(referenceDate: Date = new Date()): Promise<number> {
    const cleaned = await this.sessions.markExpiredSessionsInactive(referenceDate);

    if (cleaned > 0) {
      logger.info('Expired sessions cleaned', { count: cleaned, referenceDate });
    }

    return cleaned;
  }

  /**
   * Count sessions created within the supplied timeframe.
   */
  async countRecentSessions(userId: string, since: Date): Promise<number> {
    return this.sessions.countRecentSessions(userId, since);
  }
}

export const sessionManagementService = new SessionManagementService();


