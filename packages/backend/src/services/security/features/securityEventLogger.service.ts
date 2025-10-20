import { logger } from '../../../utils/logger';
import {
  SecurityEventCreateInput,
  SecurityEventType,
  SecuritySeverity,
  SecurityActorType
} from '../utilities/securityTypes';
import { securityEventDataService, SecurityEventDataService } from '../core/securityEventData.service';
import { securityValidationService, SecurityValidationService } from '../validation/securityValidation.service';

/**
 * Feature layer responsible for normalised security event logging.
 */
export class SecurityEventLoggerService {
  constructor(
    private readonly events: SecurityEventDataService = securityEventDataService,
    private readonly validation: SecurityValidationService = securityValidationService
  ) {}

  /**
   * Record a generic security event after validation.
   */
  async logEvent(event: SecurityEventCreateInput): Promise<void> {
    const normalized = this.validation.validateEventInput(event);
    await this.events.createEvent(normalized);

    logger.info('Security event recorded', {
      eventType: normalized.eventType,
      userId: normalized.userId,
      severity: normalized.severity,
      success: normalized.success,
      timestamp: new Date()
    });
  }

  /**
   * Log an authentication attempt including outcome and context metadata.
   */
  async logAuthenticationAttempt(
    userId: string,
    userType: SecurityActorType,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent({
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
   * Log a successful password change event.
   */
  async logPasswordChange(
    userId: string,
    userType: SecurityActorType,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
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
   * Log API key lifecycle events (creation or revocation).
   */
  async logApiKeyEvent(
    eventType: SecurityEventType.API_KEY_CREATED | SecurityEventType.API_KEY_REVOKED,
    userId: string,
    userType: SecurityActorType,
    apiKeyId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
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
   * Log security configuration changes performed by a user.
   */
  async logSecuritySettingsChange(
    userId: string,
    userType: SecurityActorType,
    settingsChanged: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
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
}

export const securityEventLoggerService = new SecurityEventLoggerService();
