// src/services/business/security.service.ts

import { logger } from '../../utils/logger';
import {
  securityEventLoggerService,
  securityEventDataService,
  sessionManagementService,
  tokenRevocationService,
  securityAnalyticsService,
  securityValidationService,
  shouldInvalidateSessions,
  SecurityEventType,
  SecuritySeverity,
  type SecurityEvent,
  type SecurityAuditSummary,
  type SystemSecurityMetrics,
  type SessionInfo,
  type SecurityActorType
} from '../security';
import type { SecurityEventCreateInput, SessionCreateInput } from '../security/utilities/securityTypes';

/**
 * Legacy Security Service wrapper that delegates to modular security services.
 */
export class SecurityService {
  private static instance: SecurityService;

  constructor(
    private readonly eventLogger = securityEventLoggerService,
    private readonly eventData = securityEventDataService,
    private readonly sessions = sessionManagementService,
    private readonly tokens = tokenRevocationService,
    private readonly analytics = securityAnalyticsService,
    private readonly validation = securityValidationService
  ) {}

  /**
   * Retrieve the singleton instance of the security service wrapper.
   */
  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Log a security event and trigger session invalidation when required.
   */
  async logSecurityEvent(eventData: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    try {
      const normalized = this.validation.validateEventInput(eventData as SecurityEventCreateInput);
      await this.eventLogger.logEvent(normalized);

      if (shouldInvalidateSessions(normalized.eventType, normalized.severity)) {
        await this.sessions.revokeAllSessions(normalized.userId, normalized.userType, {
          reason: `security_event_${normalized.eventType}`
        });
      }
    } catch (error) {
      logger.error('Failed to log security event', { eventType: eventData?.eventType, userId: eventData?.userId, error });
      throw error;
    }
  }

  /**
   * Create a session using the modular session management service.
   */
  async createSession(sessionData: Omit<SessionInfo, 'sessionId' | 'createdAt' | 'lastActivity'>): Promise<string> {
    try {
      return await this.sessions.createSession(sessionData as SessionCreateInput);
    } catch (error) {
      logger.error('Failed to create session', { userId: sessionData?.userId, error });
      throw error;
    }
  }

  /**
   * Update the last activity timestamp for a session.
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await this.sessions.updateSessionActivity(sessionId);
    } catch (error) {
      logger.error('Failed to update session activity', { sessionId, error });
    }
  }

  /**
   * Revoke a single session.
   */
  async revokeSession(sessionId: string, reason: string = 'manual_revoke'): Promise<void> {
    try {
      await this.sessions.revokeSession(sessionId, { reason });
    } catch (error) {
      logger.error('Failed to revoke session', { sessionId, error });
      throw error;
    }
  }

  /**
   * Revoke all active sessions for a user.
   */
  async revokeAllUserSessions(
    userId: string,
    excludeSessionId?: string,
    reason: string = 'security_event',
    userType: SecurityActorType = 'business'
  ): Promise<number> {
    try {
      return await this.sessions.revokeAllSessions(userId, userType, { excludeSessionId, reason });
    } catch (error) {
      logger.error('Failed to revoke user sessions', { userId, error });
      throw error;
    }
  }

  /**
   * Blacklist a token and emit a revocation event.
   */
  async blacklistToken(
    token: string,
    userId: string,
    reason: string = 'manual_revoke',
    userType: SecurityActorType = 'business'
  ): Promise<void> {
    try {
      await this.tokens.blacklistToken(token, userId, userType, reason);
    } catch (error) {
      logger.error('Failed to blacklist token', { userId, error });
      throw error;
    }
  }

  /**
   * Check if a token has been revoked.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      return await this.tokens.isTokenBlacklisted(token);
    } catch (error) {
      logger.error('Failed to check token blacklist', { error });
      return false;
    }
  }

  /**
   * Fetch recent security events for a user.
   */
  async getUserSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    try {
      return await this.eventData.findRecentEventsByUser(userId, limit);
    } catch (error) {
      logger.error('Failed to get user security events', { userId, error });
      return [];
    }
  }

  /**
   * Fetch active sessions for a user.
   */
  async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      return await this.sessions.getUserActiveSessions(userId);
    } catch (error) {
      logger.error('Failed to get user active sessions', { userId, error });
      return [];
    }
  }

  /**
   * Cleanup expired security data.
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      await this.sessions.cleanupExpiredSessions();
    } catch (error) {
      logger.error('Failed to cleanup expired data', { error });
    }
  }

  /**
   * Detect suspicious activity heuristics for a user.
   */
  async detectSuspiciousActivity(
    userId: string,
    ipAddress: string,
    userType: SecurityActorType = 'business'
  ): Promise<boolean> {
    try {
      return await this.analytics.detectSuspiciousActivity(userId, userType, ipAddress);
    } catch (error) {
      logger.error('Failed to detect suspicious activity', { userId, error });
      return false;
    }
  }

  /**
   * Log an authentication attempt.
   */
  async logAuthenticationAttempt(
    userId: string,
    userType: SecurityActorType,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    await this.eventLogger.logAuthenticationAttempt(userId, userType, success, ipAddress, userAgent, additionalData);
  }

  /**
   * Log a password change event.
   */
  async logPasswordChange(
    userId: string,
    userType: SecurityActorType,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.eventLogger.logPasswordChange(userId, userType, ipAddress, userAgent);
  }

  /**
   * Log an API key lifecycle event.
   */
  async logApiKeyEvent(
    eventType: SecurityEventType.API_KEY_CREATED | SecurityEventType.API_KEY_REVOKED,
    userId: string,
    userType: SecurityActorType,
    apiKeyId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.eventLogger.logApiKeyEvent(eventType, userId, userType, apiKeyId, ipAddress, userAgent);
  }

  /**
   * Log security settings changes for a user.
   */
  async logSecuritySettingsChange(
    userId: string,
    userType: SecurityActorType,
    settingsChanged: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.eventLogger.logSecuritySettingsChange(userId, userType, settingsChanged, ipAddress, userAgent);
  }

  /**
   * Generate a user-centric security audit report.
   */
  async getSecurityAuditReport(userId: string, days: number = 30): Promise<SecurityAuditSummary> {
    try {
      return await this.analytics.getSecurityAuditReport(userId, days);
    } catch (error) {
      logger.error('Failed to generate security audit report', { userId, error });
      throw error;
    }
  }

  /**
   * Generate system-wide security metrics.
   */
  async getSystemSecurityMetrics(days: number = 7): Promise<SystemSecurityMetrics> {
    try {
      return await this.analytics.getSystemSecurityMetrics(days);
    } catch (error) {
      logger.error('Failed to get system security metrics', { error });
      throw error;
    }
  }
}

export const securityService = SecurityService.getInstance();
