/**
 * Security Events Service
 *
 * Handles logging, tracking, and analysis of all security-related events in the authentication system.
 * Provides comprehensive security monitoring, threat detection, and audit trail functionality.
 */

import { logger } from '../../../utils/logger';
import { UtilsService } from '../../utils/utils.service';
import { enhancedCacheService } from '../../external/enhanced-cache.service';

// Import base service and types
import { AuthBaseService } from '../base/authBase.service';
import {
  SecurityContext,
  AuthEventType,
  SecurityEventsOptions
} from '../types/authTypes.service';

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security event categories
export enum SecurityEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  REGISTRATION = 'registration',
  VERIFICATION = 'verification',
  PASSWORD_MANAGEMENT = 'password_management',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCESS_CONTROL = 'access_control'
}

// Security event interface
export interface SecurityEvent {
  id?: string;
  eventType: string;
  category: SecurityEventCategory;
  severity: SecuritySeverity;
  identifier: string;
  success: boolean;
  timestamp: Date;
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  accountType?: string;
  accountId?: string;
  reason?: string;
  riskScore?: number;
}

export class SecurityEventsService extends AuthBaseService {

  // Cache TTL for security events (5 minutes)
  private readonly SECURITY_EVENTS_CACHE_TTL = 5 * 60 * 1000;

  // Risk score thresholds
  private readonly RISK_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 90
  };

  // ===== MAIN LOGGING METHODS =====

  /**
   * Log a security event with comprehensive metadata
   */
  async logSecurityEvent(
    eventType: string,
    identifier: string,
    success: boolean,
    metadata: any = {}
  ): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        eventType,
        identifier: UtilsService.maskEmail(identifier),
        success,
        timestamp: new Date(),
        metadata,
        category: this.categorizeEvent(eventType),
        severity: this.calculateSeverity(eventType, success, metadata),
        ipAddress: metadata.securityContext?.ipAddress,
        userAgent: metadata.securityContext?.userAgent,
        accountType: metadata.accountType,
        accountId: metadata.userId || metadata.businessId || metadata.manufacturerId,
        reason: metadata.reason,
        riskScore: this.calculateRiskScore(eventType, success, metadata)
      };

      // Log the security event
      logger.info('Security event', securityEvent);

      // Store for analytics and monitoring
      await this.storeSecurityEvent(securityEvent);

      // Check for suspicious patterns
      await this.analyzeForSuspiciousActivity(securityEvent);

    } catch (error) {
      logger.warn('Failed to log security event', { eventType, identifier, error });
    }
  }

  /**
   * Log authentication-specific events
   */
  async logAuthEvent(
    eventType: AuthEventType,
    identifier: string,
    success: boolean,
    securityContext?: SecurityContext,
    additionalMetadata: any = {}
  ): Promise<void> {
    const metadata = {
      ...additionalMetadata,
      securityContext
    };

    await this.logSecurityEvent(eventType, identifier, success, metadata);
  }

  // ===== SPECIALIZED LOGGING METHODS =====

  /**
   * Log business registration events
   */
  async logBusinessRegistration(
    email: string,
    success: boolean,
    businessId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.REGISTER_BUSINESS,
      email,
      success,
      securityContext,
      { businessId, reason, accountType: 'business' }
    );
  }

  /**
   * Log business verification events
   */
  async logBusinessVerification(
    email: string,
    success: boolean,
    businessId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.VERIFY_BUSINESS,
      email,
      success,
      securityContext,
      { businessId, reason, accountType: 'business' }
    );
  }

  /**
   * Log business login events
   */
  async logBusinessLogin(
    email: string,
    success: boolean,
    businessId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.LOGIN_BUSINESS,
      email,
      success,
      securityContext,
      { businessId, reason, accountType: 'business' }
    );
  }

  /**
   * Log user registration events
   */
  async logUserRegistration(
    email: string,
    success: boolean,
    userId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.REGISTER_USER,
      email,
      success,
      securityContext,
      { userId, reason, accountType: 'user' }
    );
  }

  /**
   * Log user verification events
   */
  async logUserVerification(
    email: string,
    success: boolean,
    userId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.VERIFY_USER,
      email,
      success,
      securityContext,
      { userId, reason, accountType: 'user' }
    );
  }

  /**
   * Log user login events
   */
  async logUserLogin(
    email: string,
    success: boolean,
    userId?: string,
    securityContext?: SecurityContext,
    reason?: string,
    businessId?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.LOGIN_USER,
      email,
      success,
      securityContext,
      { userId, reason, accountType: 'user', businessId }
    );
  }

  /**
   * Log manufacturer registration events
   */
  async logManufacturerRegistration(
    email: string,
    success: boolean,
    manufacturerId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.REGISTER_MANUFACTURER,
      email,
      success,
      securityContext,
      { manufacturerId, reason, accountType: 'manufacturer' }
    );
  }

  /**
   * Log manufacturer verification events
   */
  async logManufacturerVerification(
    email: string,
    success: boolean,
    manufacturerId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.VERIFY_MANUFACTURER,
      email,
      success,
      securityContext,
      { manufacturerId, reason, accountType: 'manufacturer' }
    );
  }

  /**
   * Log manufacturer login events
   */
  async logManufacturerLogin(
    email: string,
    success: boolean,
    manufacturerId?: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.LOGIN_MANUFACTURER,
      email,
      success,
      securityContext,
      { manufacturerId, reason, accountType: 'manufacturer' }
    );
  }

  /**
   * Log password reset events
   */
  async logPasswordReset(
    email: string,
    success: boolean,
    eventType: 'request' | 'confirm',
    securityContext?: SecurityContext,
    reason?: string,
    accountType?: string
  ): Promise<void> {
    const authEventType = eventType === 'request'
      ? AuthEventType.PASSWORD_RESET_REQUEST
      : AuthEventType.PASSWORD_RESET_CONFIRM;

    await this.logAuthEvent(
      authEventType,
      email,
      success,
      securityContext,
      { reason, accountType }
    );
  }

  /**
   * Log email gating denial events
   */
  async logEmailGatingDenial(
    email: string,
    businessId: string,
    securityContext?: SecurityContext,
    reason?: string
  ): Promise<void> {
    await this.logAuthEvent(
      AuthEventType.LOGIN_USER_EMAIL_GATING_DENIED,
      email,
      false,
      securityContext,
      { businessId, reason, accountType: 'user' }
    );
  }

  // ===== ANALYTICS AND MONITORING =====

  /**
   * Get security events with filtering and pagination
   */
  async getSecurityEvents(options: SecurityEventsOptions): Promise<{
    events: SecurityEvent[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { page = 1, limit = 50, eventType } = options;
      const skip = (page - 1) * limit;

      // In a production environment, this would query a security events database
      // For now, return a structured response format

      return {
        events: [], // Would contain actual security events from storage
        total: 0,
        page,
        limit
      };

    } catch (error) {
      logger.error('Failed to get security events', { error, options });
      return {
        events: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 50
      };
    }
  }

  /**
   * Get security statistics for a given period
   */
  async getSecurityStats(options: {
    days?: number;
    accountType?: string;
    eventType?: string;
  } = {}): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    riskDistribution: Record<SecuritySeverity, number>;
  }> {
    try {
      const { days = 7 } = options;

      // In production, this would aggregate from security events storage
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        uniqueUsers: 0,
        topFailureReasons: [],
        riskDistribution: {
          [SecuritySeverity.LOW]: 0,
          [SecuritySeverity.MEDIUM]: 0,
          [SecuritySeverity.HIGH]: 0,
          [SecuritySeverity.CRITICAL]: 0
        }
      };

    } catch (error) {
      logger.error('Failed to get security statistics', { error, options });
      throw error;
    }
  }

  /**
   * Analyze authentication patterns for anomalies
   */
  async analyzeAuthPatterns(email: string, timeWindow: number = 60): Promise<{
    isAnomalous: boolean;
    riskScore: number;
    patterns: string[];
    recommendations: string[];
  }> {
    try {
      const normalizedEmail = UtilsService.normalizeEmail(email);

      // In production, this would analyze historical patterns
      // Check for:
      // - Unusual login times
      // - Multiple failed attempts
      // - Geographic anomalies
      // - Device fingerprint changes
      // - Rapid successive attempts

      return {
        isAnomalous: false,
        riskScore: 0,
        patterns: [],
        recommendations: []
      };

    } catch (error) {
      logger.error('Failed to analyze auth patterns', { error, email });
      return {
        isAnomalous: false,
        riskScore: 0,
        patterns: [],
        recommendations: []
      };
    }
  }

  // ===== THREAT DETECTION =====

  /**
   * Detect and respond to suspicious activity
   */
  private async analyzeForSuspiciousActivity(event: SecurityEvent): Promise<void> {
    try {
      // Analyze the event for suspicious patterns
      const suspiciousIndicators = [];

      // Check for high-risk events
      if (event.severity === SecuritySeverity.HIGH || event.severity === SecuritySeverity.CRITICAL) {
        suspiciousIndicators.push('high_severity_event');
      }

      // Check for failed authentication patterns
      if (!event.success && event.category === SecurityEventCategory.AUTHENTICATION) {
        suspiciousIndicators.push('failed_authentication');
      }

      // Check for rapid successive attempts (would need rate limiting data)
      // Check for geographic anomalies (would need IP geolocation)
      // Check for unusual user agent patterns

      if (suspiciousIndicators.length > 0) {
        await this.handleSuspiciousActivity(event, suspiciousIndicators);
      }

    } catch (error) {
      logger.warn('Failed to analyze suspicious activity', { error, eventType: event.eventType });
    }
  }

  /**
   * Handle detected suspicious activity
   */
  private async handleSuspiciousActivity(
    event: SecurityEvent,
    indicators: string[]
  ): Promise<void> {
    try {
      // Log the suspicious activity
      logger.warn('Suspicious activity detected', {
        eventType: event.eventType,
        identifier: event.identifier,
        indicators,
        riskScore: event.riskScore
      });

      // Take appropriate action based on risk score
      if (event.riskScore && event.riskScore > this.RISK_THRESHOLDS.HIGH) {
        // High-risk actions:
        // - Rate limit the IP/user
        // - Require additional verification
        // - Alert security team
        // - Temporary account lockout
      }

      // Store suspicious activity for analysis
      await this.storeSuspiciousActivity(event, indicators);

    } catch (error) {
      logger.error('Failed to handle suspicious activity', { error });
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Categorize security event type
   */
  private categorizeEvent(eventType: string): SecurityEventCategory {
    if (eventType.includes('REGISTER')) {
      return SecurityEventCategory.REGISTRATION;
    }
    if (eventType.includes('VERIFY')) {
      return SecurityEventCategory.VERIFICATION;
    }
    if (eventType.includes('LOGIN')) {
      return SecurityEventCategory.AUTHENTICATION;
    }
    if (eventType.includes('PASSWORD_RESET')) {
      return SecurityEventCategory.PASSWORD_MANAGEMENT;
    }
    if (eventType.includes('EMAIL_GATING_DENIED')) {
      return SecurityEventCategory.ACCESS_CONTROL;
    }
    return SecurityEventCategory.AUTHENTICATION;
  }

  /**
   * Calculate security event severity
   */
  private calculateSeverity(
    eventType: string,
    success: boolean,
    metadata: any
  ): SecuritySeverity {
    // Failed login attempts
    if (!success && eventType.includes('LOGIN')) {
      return SecuritySeverity.MEDIUM;
    }

    // Email gating denials
    if (eventType.includes('EMAIL_GATING_DENIED')) {
      return SecuritySeverity.HIGH;
    }

    // Failed password resets
    if (!success && eventType.includes('PASSWORD_RESET')) {
      return SecuritySeverity.MEDIUM;
    }

    // Failed registrations might indicate automated attacks
    if (!success && eventType.includes('REGISTER')) {
      return SecuritySeverity.LOW;
    }

    // Successful events are generally low risk
    if (success) {
      return SecuritySeverity.LOW;
    }

    return SecuritySeverity.LOW;
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(
    eventType: string,
    success: boolean,
    metadata: any
  ): number {
    let score = 0;

    // Base score for failed events
    if (!success) {
      score += 20;
    }

    // Event type scores
    if (eventType.includes('LOGIN')) {
      score += success ? 5 : 25;
    }
    if (eventType.includes('PASSWORD_RESET')) {
      score += success ? 10 : 20;
    }
    if (eventType.includes('EMAIL_GATING_DENIED')) {
      score += 40;
    }

    // Reason-based scores
    if (metadata.reason) {
      if (metadata.reason.includes('Invalid password')) {
        score += 15;
      }
      if (metadata.reason.includes('Account not found')) {
        score += 10;
      }
      if (metadata.reason.includes('Too many attempts')) {
        score += 30;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Store security event for persistence and analysis
   */
  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // In production, this would store to a security events database
      // For now, we'll cache it for short-term analysis

      await enhancedCacheService.cacheAnalytics('security', {
        type: 'event',
        eventId: `${event.eventType}_${Date.now()}`
      }, event, {
        ttl: this.SECURITY_EVENTS_CACHE_TTL
      });

    } catch (error) {
      logger.warn('Failed to store security event', { error });
    }
  }

  /**
   * Store suspicious activity for monitoring
   */
  private async storeSuspiciousActivity(
    event: SecurityEvent,
    indicators: string[]
  ): Promise<void> {
    try {
      const suspiciousActivity = {
        ...event,
        indicators,
        detectedAt: new Date(),
        status: 'detected'
      };

      await enhancedCacheService.cacheAnalytics('security', {
        type: 'suspicious_activity',
        eventId: `suspicious_${Date.now()}`
      }, suspiciousActivity, {
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      });

    } catch (error) {
      logger.warn('Failed to store suspicious activity', { error });
    }
  }

  /**
   * Clear security event caches
   */
  async clearSecurityCaches(): Promise<void> {
    try {
      await enhancedCacheService.invalidateByTags([
        'security_events',
        'suspicious_activity',
        'security_analytics'
      ]);
      logger.info('Security caches cleared');
    } catch (error) {
      logger.warn('Failed to clear security caches', { error });
    }
  }

  /**
   * Get security health status
   */
  async getSecurityHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    activeThreatLevel: SecuritySeverity;
    recentIncidents: number;
    recommendations: string[];
  }> {
    try {
      // In production, this would analyze recent security events
      return {
        status: 'healthy',
        activeThreatLevel: SecuritySeverity.LOW,
        recentIncidents: 0,
        recommendations: []
      };
    } catch (error) {
      logger.error('Failed to get security health', { error });
      return {
        status: 'critical',
        activeThreatLevel: SecuritySeverity.CRITICAL,
        recentIncidents: 0,
        recommendations: ['Security monitoring system offline']
      };
    }
  }
}

// Export singleton instance
export const securityEventsService = new SecurityEventsService();