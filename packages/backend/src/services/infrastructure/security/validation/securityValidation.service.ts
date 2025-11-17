import { createAppError } from '../../../../middleware/core/error.middleware'; 
import {
  SecurityActorType,
  SecurityEventCreateInput,
  SecurityEventType,
  SecuritySeverity,
  SessionCreateInput
} from '../utils/securityTypes';

const SECURITY_ACTOR_TYPES: SecurityActorType[] = ['business', 'user', 'manufacturer'];

/**
 * Validation utilities for security-related payloads.
 */
export class SecurityValidationService {
  /**
   * Ensure user context is present and supported.
   */
  ensureActor(userId: string | undefined, userType: SecurityActorType | undefined): {
    userId: string;
    userType: SecurityActorType;
  } {
    const normalizedUserId = userId?.toString().trim();
    if (!normalizedUserId) {
      throw createAppError('User identifier is required for security operations', 400, 'SECURITY_USER_REQUIRED');
    }

    if (!userType || !SECURITY_ACTOR_TYPES.includes(userType)) {
      throw createAppError(`Unsupported security actor type: ${userType}`, 400, 'SECURITY_INVALID_ACTOR');
    }

    return { userId: normalizedUserId, userType };
  }

  /**
   * Validate incoming security event payloads.
   */
  validateEventInput(input: SecurityEventCreateInput): SecurityEventCreateInput {
    if (!input) {
      throw createAppError('Security event payload is required', 400, 'SECURITY_EVENT_REQUIRED');
    }

    const { userId, userType } = this.ensureActor(input.userId, input.userType);

    if (!Object.values(SecurityEventType).includes(input.eventType)) {
      throw createAppError(`Unsupported security event type: ${input.eventType}`, 400, 'SECURITY_EVENT_TYPE_INVALID');
    }

    if (!Object.values(SecuritySeverity).includes(input.severity)) {
      throw createAppError(`Unsupported security event severity: ${input.severity}`, 400, 'SECURITY_EVENT_SEVERITY_INVALID');
    }

    return {
      ...input,
      userId,
      userType,
      ipAddress: input.ipAddress?.trim() || undefined,
      userAgent: input.userAgent?.trim() || undefined,
      deviceFingerprint: input.deviceFingerprint?.toString().trim() || undefined,
      sessionId: input.sessionId?.toString().trim() || undefined,
      tokenId: input.tokenId?.toString().trim() || undefined
    };
  }

  /**
   * Validate session creation payloads.
   */
  validateSessionCreateInput(input: SessionCreateInput): SessionCreateInput {
    if (!input) {
      throw createAppError('Session data is required', 400, 'SECURITY_SESSION_REQUIRED');
    }

    const { userId, userType } = this.ensureActor(input.userId, input.userType);

    const tokenId = input.tokenId?.toString().trim();
    if (!tokenId) {
      throw createAppError('Session token identifier is required', 400, 'SECURITY_SESSION_TOKEN_REQUIRED');
    }

    const ipAddress = input.ipAddress?.toString().trim();
    if (!ipAddress) {
      throw createAppError('Session IP address is required', 400, 'SECURITY_SESSION_IP_REQUIRED');
    }

    const userAgent = input.userAgent?.toString().trim();
    if (!userAgent) {
      throw createAppError('Session user agent is required', 400, 'SECURITY_SESSION_UA_REQUIRED');
    }

    const expiresAt = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt ?? Date.now());
    if (Number.isNaN(expiresAt.getTime())) {
      throw createAppError('Session expiry is invalid', 400, 'SECURITY_SESSION_EXPIRY_INVALID');
    }

    return {
      ...input,
      userId,
      userType,
      tokenId,
      ipAddress,
      userAgent,
      deviceFingerprint: input.deviceFingerprint?.toString().trim() || undefined,
      expiresAt
    };
  }

  /**
   * Ensure a token string is present for blacklist operations.
   */
  ensureToken(token: string | undefined): string {
    const normalized = token?.toString().trim();
    if (!normalized) {
      throw createAppError('Token is required for blacklist operations', 400, 'SECURITY_TOKEN_REQUIRED');
    }

    return normalized;
  }
}

export const securityValidationService = new SecurityValidationService();


