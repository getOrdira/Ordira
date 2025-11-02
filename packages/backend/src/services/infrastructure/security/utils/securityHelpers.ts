import jwt from 'jsonwebtoken';
import { UtilsService } from '../../shared';
import {
  SECURITY_AUDIT_MAX_RISK_SCORE,
  SECURITY_EVENT_DEFAULT_FAILURE_RETENTION_DAYS,
  SECURITY_EVENT_DEFAULT_SUCCESS_RETENTION_DAYS,
  SECURITY_EVENT_RETENTION_DAYS
} from './securityConfig';
import {
  SecurityEvent,
  SecurityEventCreateInput,
  SecurityEventType,
  SecuritySeverity
} from './securityTypes';

const HIGH_SEVERITY_SESSION_EVENTS = new Set<SecurityEventType>([
  SecurityEventType.PASSWORD_CHANGE,
  SecurityEventType.PASSWORD_RESET,
  SecurityEventType.SUSPICIOUS_ACTIVITY,
  SecurityEventType.ACCOUNT_LOCKED,
  SecurityEventType.TWO_FACTOR_DISABLED
]);

/**
 * Determine if sessions should be invalidated for a given security event.
 */
export function shouldInvalidateSessions(eventType: SecurityEventType, severity: SecuritySeverity): boolean {
  if (severity === SecuritySeverity.CRITICAL) {
    return true;
  }

  return HIGH_SEVERITY_SESSION_EVENTS.has(eventType);
}

/**
 * Safely extract a token identifier from a JWT, falling back to a hashed prefix.
 */
export function extractTokenId(token: string): string {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    if (decoded?.jti) {
      return decoded.jti;
    }
  } catch (error) {
    // Swallow decode errors and fall back to hash-based identifier
  }

  return UtilsService.hashString(token).slice(0, 16);
}

/**
 * Determine the retention expiration date for a security event.
 */
export function resolveEventExpiry(event: SecurityEventCreateInput): Date {
  const retentionDays = event.success
    ? SECURITY_EVENT_DEFAULT_SUCCESS_RETENTION_DAYS
    : SECURITY_EVENT_DEFAULT_FAILURE_RETENTION_DAYS;

  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
}

/**
 * Constrain risk score into supported range.
 */
function clampRiskScore(score: number): number {
  return Math.min(Math.max(score, 0), SECURITY_AUDIT_MAX_RISK_SCORE);
}

/**
 * Calculate an aggregate risk score across a list of security events.
 */
export function calculateRiskScore(events: SecurityEvent[]): number {
  let score = 0;

  for (const event of events) {
    switch (event.severity) {
      case SecuritySeverity.CRITICAL:
        score += 10;
        break;
      case SecuritySeverity.HIGH:
        score += 5;
        break;
      case SecuritySeverity.MEDIUM:
        score += 2;
        break;
      case SecuritySeverity.LOW:
        score += 1;
        break;
    }

    if (!event.success) {
      score += 2;
    }
  }

  return clampRiskScore(score);
}

/**
 * Resolve the default expiration date for session documents.
 */
export function resolveSessionExpiry(expiresAt?: Date): Date {
  if (expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime())) {
    return expiresAt;
  }

  return new Date(Date.now() + SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}



