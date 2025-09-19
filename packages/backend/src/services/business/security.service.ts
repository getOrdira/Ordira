// src/services/business/security.service.ts

import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { UtilsService } from '../utils/utils.service';

type JWTToken = {
  exp?: number;
  jti?: string;
  [key: string]: any;
};

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_INVALIDATED = 'TOKEN_INVALIDATED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PHONE_VERIFIED = 'PHONE_VERIFIED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  SECURITY_SETTINGS_CHANGED = 'SECURITY_SETTINGS_CHANGED'
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security event interface
export interface SecurityEvent {
  eventType: SecurityEventType;
  userId: string;
  userType: 'business' | 'user' | 'manufacturer';
  severity: SecuritySeverity;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  sessionId?: string;
  tokenId?: string;
  additionalData?: Record<string, any>;
  timestamp: Date;
  expiresAt?: Date; // For automatic cleanup
}

// Session management interface
export interface SessionInfo {
  sessionId: string;
  userId: string;
  userType: 'business' | 'user' | 'manufacturer';
  tokenId: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * Enhanced Security Service for comprehensive session management and security event handling
 */
export class SecurityService {
  private static instance: SecurityService;
  private securityEvents: mongoose.Model<any>;
  private activeSessions: mongoose.Model<any>;
  private blacklistedTokens: mongoose.Model<any>;

  constructor() {
    this.initializeModels();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize MongoDB models for security data
   */
  private initializeModels(): void {
    // Security Events Schema
    const securityEventSchema = new mongoose.Schema({
      eventType: { type: String, required: true, enum: Object.values(SecurityEventType) },
      userId: { type: String, required: true, index: true },
      userType: { type: String, required: true, enum: ['business', 'user', 'manufacturer'] },
      severity: { type: String, required: true, enum: Object.values(SecuritySeverity) },
      success: { type: Boolean, required: true },
      ipAddress: { type: String },
      userAgent: { type: String },
      deviceFingerprint: { type: String },
      sessionId: { type: String },
      tokenId: { type: String },
      additionalData: { type: mongoose.Schema.Types.Mixed },
      timestamp: { type: Date, default: Date.now, index: true },
      expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
    });

    // Active Sessions Schema
    const sessionSchema = new mongoose.Schema({
      sessionId: { type: String, required: true, unique: true },
      userId: { type: String, required: true, index: true },
      userType: { type: String, required: true, enum: ['business', 'user', 'manufacturer'] },
      tokenId: { type: String, required: true },
      ipAddress: { type: String, required: true },
      userAgent: { type: String, required: true },
      deviceFingerprint: { type: String },
      createdAt: { type: Date, default: Date.now },
      lastActivity: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
      isActive: { type: Boolean, default: true }
    });

    // Blacklisted Tokens Schema
    const blacklistedTokenSchema = new mongoose.Schema({
      tokenId: { type: String, required: true, unique: true },
      userId: { type: String, required: true, index: true },
      tokenHash: { type: String, required: true }, // Hash of the token for security
      reason: { type: String, required: true },
      blacklistedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
    });

    this.securityEvents = mongoose.model('SecurityEvent', securityEventSchema);
    this.activeSessions = mongoose.model('ActiveSession', sessionSchema);
    this.blacklistedTokens = mongoose.model('BlacklistedToken', blacklistedTokenSchema);
  }

  /**
   * Log a security event with comprehensive data
   */
  async logSecurityEvent(eventData: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    try {
      const securityEvent = new this.securityEvents({
        ...eventData,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days retention
      });

      await securityEvent.save();

      // Log to console for immediate visibility
      logger.info('🔒 Security Event: ${eventData.eventType}', {
        userId: eventData.userId,
        severity: eventData.severity,
        success: eventData.success,
        ip: eventData.ipAddress,
        timestamp: new Date()
      });

      // Trigger session invalidation for critical events
      if (this.shouldInvalidateSessions(eventData.eventType, eventData.severity)) {
        await this.invalidateUserSessions(eventData.userId, eventData.eventType);
      }

    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Create a new active session
   */
  async createSession(sessionData: Omit<SessionInfo, 'sessionId' | 'createdAt' | 'lastActivity'>): Promise<string> {
    try {
      const sessionId = UtilsService.generateSecureId();
      const session = new this.activeSessions({
        sessionId,
        ...sessionData,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      await session.save();
      return sessionId;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await this.activeSessions.updateOne(
        { sessionId, isActive: true },
        { lastActivity: new Date() }
      );
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, reason: string = 'manual_revoke'): Promise<void> {
    try {
      const session = await this.activeSessions.findOne({ sessionId });
      if (session) {
        await this.activeSessions.updateOne(
          { sessionId },
          { isActive: false }
        );

        // Log security event
        await this.logSecurityEvent({
          eventType: SecurityEventType.SESSION_REVOKED,
          userId: session.userId,
          userType: session.userType,
          severity: SecuritySeverity.MEDIUM,
          success: true,
          sessionId,
          additionalData: { reason }
        });
      }
    } catch (error) {
      logger.error('Failed to revoke session:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeAllUserSessions(userId: string, excludeSessionId?: string, reason: string = 'security_event'): Promise<number> {
    try {
      const query: any = { userId, isActive: true };
      if (excludeSessionId) {
        query.sessionId = { $ne: excludeSessionId };
      }

      const result = await this.activeSessions.updateMany(
        query,
        { isActive: false }
      );

      // Log security event
      await this.logSecurityEvent({
        eventType: SecurityEventType.ALL_SESSIONS_REVOKED,
        userId,
        userType: 'business', // This would need to be determined from context
        severity: SecuritySeverity.HIGH,
        success: true,
        additionalData: { 
          revokedCount: result.modifiedCount,
          reason,
          excludeSessionId: excludeSessionId || 'none'
        }
      });

      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to revoke user sessions:', error);
      throw error;
    }
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(token: string, userId: string, reason: string = 'manual_revoke'): Promise<void> {
    try {
      const tokenId = this.extractTokenId(token);
      const tokenHash = UtilsService.hashString(token);

      // Decode token to get expiration
      const decoded = jwt.decode(token) as JWTToken;
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.blacklistedTokens.create({
        tokenId,
        userId,
        tokenHash,
        reason,
        expiresAt
      });

      // Log security event
      await this.logSecurityEvent({
        eventType: SecurityEventType.TOKEN_INVALIDATED,
        userId,
        userType: 'business', // This would need to be determined from context
        severity: SecuritySeverity.MEDIUM,
        success: true,
        tokenId,
        additionalData: { reason }
      });
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenId = this.extractTokenId(token);
      const tokenHash = UtilsService.hashString(token);

      const blacklistedToken = await this.blacklistedTokens.findOne({
        $or: [
          { tokenId },
          { tokenHash }
        ]
      });

      return !!blacklistedToken;
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      return false; // Assume not blacklisted if check fails
    }
  }

  /**
   * Invalidate all sessions for a user due to security event
   */
  private async invalidateUserSessions(userId: string, eventType: SecurityEventType): Promise<void> {
    try {
      const revokedCount = await this.revokeAllUserSessions(userId, undefined, `security_event_${eventType}`);
      
      logger.info('🔒 Security Event: Invalidated ${revokedCount} sessions for user ${userId} due to ${eventType}');
    } catch (error) {
      logger.error('Failed to invalidate user sessions:', error);
    }
  }

  /**
   * Determine if sessions should be invalidated based on event type and severity
   */
  private shouldInvalidateSessions(eventType: SecurityEventType, severity: SecuritySeverity): boolean {
    // Critical events always invalidate sessions
    if (severity === SecuritySeverity.CRITICAL) {
      return true;
    }

    // High severity events that require session invalidation
    const highSeverityEvents = [
      SecurityEventType.PASSWORD_CHANGE,
      SecurityEventType.PASSWORD_RESET,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.ACCOUNT_LOCKED,
      SecurityEventType.TWO_FACTOR_DISABLED
    ];

    return highSeverityEvents.includes(eventType);
  }

  /**
   * Extract token ID from JWT token
   */
  private extractTokenId(token: string): string {
    try {
      const decoded = jwt.decode(token) as JWTToken;
      return decoded?.jti || UtilsService.hashString(token).slice(0, 16);
    } catch (error) {
      return UtilsService.hashString(token).slice(0, 16);
    }
  }

  /**
   * Get security events for a user
   */
  async getUserSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const events = await this.securityEvents
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return events as SecurityEvent[];
    } catch (error) {
      logger.error('Failed to get user security events:', error);
      return [];
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await this.activeSessions
        .find({ userId, isActive: true })
        .sort({ lastActivity: -1 })
        .lean();

      return sessions as SessionInfo[];
    } catch (error) {
      logger.error('Failed to get user active sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions and events
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean up expired sessions
      const expiredSessions = await this.activeSessions.updateMany(
        { expiresAt: { $lt: now } },
        { isActive: false }
      );

      // Clean up expired security events (handled by TTL index)
      // Clean up expired blacklisted tokens (handled by TTL index)

      logger.info('🧹 Cleaned up ${expiredSessions.modifiedCount} expired sessions');
    } catch (error) {
      logger.error('Failed to cleanup expired data:', error);
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(userId: string, ipAddress: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Check for multiple failed login attempts
      const failedLogins = await this.securityEvents.countDocuments({
        userId,
        eventType: SecurityEventType.LOGIN_FAILED,
        timestamp: { $gte: oneHourAgo }
      });

      // Check for multiple IP addresses
      const uniqueIPs = await this.securityEvents.distinct('ipAddress', {
        userId,
        timestamp: { $gte: oneHourAgo }
      });

      // Check for rapid session creation
      const recentSessions = await this.activeSessions.countDocuments({
        userId,
        createdAt: { $gte: oneHourAgo }
      });

      const isSuspicious = failedLogins >= 5 || uniqueIPs.length >= 3 || recentSessions >= 10;

      if (isSuspicious) {
        await this.logSecurityEvent({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          userId,
          userType: 'business', // This would need to be determined from context
          severity: SecuritySeverity.HIGH,
          success: false,
          ipAddress,
          additionalData: {
            failedLogins,
            uniqueIPs: uniqueIPs.length,
            recentSessions
          }
        });
      }

      return isSuspicious;
    } catch (error) {
      logger.error('Failed to detect suspicious activity:', error);
      return false;
    }
  }

  /**
   * Log authentication attempt (success or failure)
   */
  async logAuthenticationAttempt(
    userId: string,
    userType: 'business' | 'user' | 'manufacturer',
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      userId,
      userType,
      severity: success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
      success,
      ipAddress,
      userAgent,
      additionalData
    });
  }

  /**
   * Log password change event
   */
  async logPasswordChange(
    userId: string,
    userType: 'business' | 'user' | 'manufacturer',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_CHANGE,
      userId,
      userType,
      severity: SecuritySeverity.HIGH,
      success: true,
      ipAddress,
      userAgent
    });
  }

  /**
   * Log API key creation/revocation
   */
  async logApiKeyEvent(
    eventType: SecurityEventType.API_KEY_CREATED | SecurityEventType.API_KEY_REVOKED,
    userId: string,
    userType: 'business' | 'user' | 'manufacturer',
    apiKeyId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      userId,
      userType,
      severity: SecuritySeverity.MEDIUM,
      success: true,
      ipAddress,
      userAgent,
      additionalData: { apiKeyId }
    });
  }

  /**
   * Log security settings change
   */
  async logSecuritySettingsChange(
    userId: string,
    userType: 'business' | 'user' | 'manufacturer',
    settingsChanged: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SECURITY_SETTINGS_CHANGED,
      userId,
      userType,
      severity: SecuritySeverity.MEDIUM,
      success: true,
      ipAddress,
      userAgent,
      additionalData: { settingsChanged }
    });
  }

  /**
   * Get security audit report for a user
   */
  async getSecurityAuditReport(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentActivity: SecurityEvent[];
    riskScore: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const events = await this.securityEvents.find({
        userId,
        timestamp: { $gte: startDate }
      }).lean();

      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventsBySeverity = events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate risk score based on events
      let riskScore = 0;
      events.forEach(event => {
        switch (event.severity) {
          case SecuritySeverity.CRITICAL:
            riskScore += 10;
            break;
          case SecuritySeverity.HIGH:
            riskScore += 5;
            break;
          case SecuritySeverity.MEDIUM:
            riskScore += 2;
            break;
          case SecuritySeverity.LOW:
            riskScore += 1;
            break;
        }
        if (!event.success) {
          riskScore += 2; // Failed events increase risk
        }
      });

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        recentActivity: events.slice(0, 10) as SecurityEvent[],
        riskScore: Math.min(riskScore, 100) // Cap at 100
      };
    } catch (error) {
      logger.error('Failed to generate security audit report:', error);
      throw error;
    }
  }

  /**
   * Get system-wide security metrics
   */
  async getSystemSecurityMetrics(days: number = 7): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topUsersByEvents: Array<{ userId: string; eventCount: number }>;
    suspiciousActivityCount: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const events = await this.securityEvents.find({
        timestamp: { $gte: startDate }
      }).lean();

      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventsBySeverity = events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const userEventCounts = events.reduce((acc, event) => {
        acc[event.userId] = (acc[event.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topUsersByEvents = Object.entries(userEventCounts)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      const suspiciousActivityCount = eventsByType[SecurityEventType.SUSPICIOUS_ACTIVITY] || 0;

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        topUsersByEvents,
        suspiciousActivityCount
      };
    } catch (error) {
      logger.error('Failed to get system security metrics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();
