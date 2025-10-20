import { securityEventDataService, SecurityEventDataService } from '../core/securityEventData.service';
import { sessionManagementService, SessionManagementService } from './sessionManagement.service';
import { securityEventLoggerService, SecurityEventLoggerService } from './securityEventLogger.service';
import {
  SUSPICIOUS_FAILED_LOGIN_THRESHOLD,
  SUSPICIOUS_RECENT_SESSION_THRESHOLD,
  SUSPICIOUS_UNIQUE_IP_THRESHOLD
} from '../utilities/securityConfig';
import { calculateRiskScore } from '../utilities/securityHelpers';
import {
  SecurityActorType,
  SecurityAuditSummary,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  SystemSecurityMetrics
} from '../utilities/securityTypes';

/**
 * Feature layer delivering security analytics and risk detection helpers.
 */
export class SecurityAnalyticsService {
  constructor(
    private readonly events: SecurityEventDataService = securityEventDataService,
    private readonly sessions: SessionManagementService = sessionManagementService,
    private readonly eventLogger: SecurityEventLoggerService = securityEventLoggerService
  ) {}

  /**
   * Detect suspicious activity for a user within the last hour.
   */
  async detectSuspiciousActivity(
    userId: string,
    userType: SecurityActorType,
    ipAddress: string | undefined
  ): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [failedLogins, uniqueIPs, recentSessions] = await Promise.all([
      this.events.countFailedLogins(userId, oneHourAgo),
      this.events.distinctIpAddresses(userId, oneHourAgo),
      this.sessions.countRecentSessions(userId, oneHourAgo)
    ]);

    const isSuspicious = failedLogins >= SUSPICIOUS_FAILED_LOGIN_THRESHOLD ||
      uniqueIPs.length >= SUSPICIOUS_UNIQUE_IP_THRESHOLD ||
      recentSessions >= SUSPICIOUS_RECENT_SESSION_THRESHOLD;

    if (isSuspicious) {
      await this.eventLogger.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId,
        userType,
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
  }

  /**
   * Build an audit report summarising a user's recent security posture.
   */
  async getSecurityAuditReport(userId: string, days: number = 30): Promise<SecurityAuditSummary> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await this.events.findEventsByUserSince(userId, startDate);

    const eventsByType = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    const eventsBySeverity = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});

    const riskScore = calculateRiskScore(events as SecurityEvent[]);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      recentActivity: events.slice(0, 10) as SecurityEvent[],
      riskScore
    };
  }

  /**
   * Calculate system-wide security metrics for dashboards.
   */
  async getSystemSecurityMetrics(days: number = 7): Promise<SystemSecurityMetrics> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await this.events.findEventsSince(startDate);

    const eventsByType = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    const eventsBySeverity = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});

    const userEventCounts = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.userId] = (acc[event.userId] || 0) + 1;
      return acc;
    }, {});

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
  }
}

export const securityAnalyticsService = new SecurityAnalyticsService();
