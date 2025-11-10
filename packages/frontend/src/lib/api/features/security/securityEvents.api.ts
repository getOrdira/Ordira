// src/lib/api/features/security/securityEvents.api.ts
// Security events API aligned with backend routes/features/security/securityEvents.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SecurityActorType,
  SecurityAuthAttemptResponse,
  SecurityEvent,
  SecurityEventCreateInput,
  SecurityEventLogResponse,
  SecurityEventsEnvelope
} from '@/lib/types/features/security';
import { SecurityEventType, SecuritySeverity } from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeBoolean,
  sanitizeEnum,
  sanitizeOptionalEnum,
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeOptionalDate,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/events';

type HttpMethod = 'GET' | 'POST';

const SECURITY_ACTOR_TYPES: readonly SecurityActorType[] = ['business', 'user', 'manufacturer'] as const;
const SECURITY_EVENT_TYPES = Object.values(SecurityEventType);
const SECURITY_SEVERITIES = Object.values(SecuritySeverity);

const createSecurityEventsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'events',
  method,
  endpoint,
  ...context
});

export interface LogAuthAttemptPayload {
  userId: string;
  userType: SecurityActorType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  additionalData?: Record<string, unknown>;
}

export interface EventsQueryParams {
  userId?: string;
  limit?: number;
}

export interface EventsSinceQueryParams {
  userId?: string;
  days?: number;
}

export interface SystemEventsQueryParams {
  days?: number;
}

const sanitizeEventPayload = (payload: SecurityEventCreateInput) => {
  const timestamp = sanitizeOptionalDate(payload.timestamp, 'timestamp');
  const expiresAt = sanitizeOptionalDate(payload.expiresAt, 'expiresAt');

  return baseApi.sanitizeRequestData({
    eventType: sanitizeEnum(payload.eventType, 'eventType', SECURITY_EVENT_TYPES),
    userId: sanitizeString(payload.userId, 'userId', { minLength: 1, maxLength: 200, trim: true }),
    userType: sanitizeEnum(payload.userType, 'userType', SECURITY_ACTOR_TYPES),
    severity: sanitizeEnum(payload.severity, 'severity', SECURITY_SEVERITIES),
    success: sanitizeBoolean(payload.success, 'success'),
    ipAddress: sanitizeOptionalString(payload.ipAddress, 'ipAddress', { trim: true, maxLength: 200 }),
    userAgent: sanitizeOptionalString(payload.userAgent, 'userAgent', { trim: true, maxLength: 500 }),
    deviceFingerprint: sanitizeOptionalString(payload.deviceFingerprint, 'deviceFingerprint', { trim: true, maxLength: 200 }),
    sessionId: sanitizeOptionalString(payload.sessionId, 'sessionId', { trim: true, maxLength: 200 }),
    tokenId: sanitizeOptionalString(payload.tokenId, 'tokenId', { trim: true, maxLength: 200 }),
    additionalData: sanitizeOptionalJsonObject(payload.additionalData, 'additionalData'),
    timestamp: timestamp ? timestamp.toISOString() : undefined,
    expiresAt: expiresAt ? expiresAt.toISOString() : undefined
  });
};

const sanitizeAuthAttemptPayload = (payload: LogAuthAttemptPayload) => {
  return baseApi.sanitizeRequestData({
    userId: sanitizeObjectId(payload.userId, 'userId'),
    userType: sanitizeEnum(payload.userType, 'userType', SECURITY_ACTOR_TYPES),
    success: sanitizeBoolean(payload.success, 'success'),
    ipAddress: sanitizeOptionalString(payload.ipAddress, 'ipAddress', { trim: true, maxLength: 200 }),
    userAgent: sanitizeOptionalString(payload.userAgent, 'userAgent', { trim: true, maxLength: 500 }),
    additionalData: sanitizeOptionalJsonObject(payload.additionalData, 'additionalData')
  });
};

const sanitizeEventsQuery = (query?: EventsQueryParams) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    userId: sanitizeOptionalObjectId(query.userId, 'userId'),
    limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 200 })
  });
};

const sanitizeEventsSinceQuery = (query?: EventsSinceQueryParams) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    userId: sanitizeOptionalObjectId(query.userId, 'userId'),
    days: sanitizeOptionalNumber(query.days, 'days', { integer: true, min: 1, max: 365 })
  });
};

const sanitizeSystemEventsQuery = (query?: SystemEventsQueryParams) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    days: sanitizeOptionalNumber(query.days, 'days', { integer: true, min: 1, max: 180 })
  });
};

export const securityEventsApi = {
  /**
   * Log a security event.
   * POST /api/security/events/log
   */
  async logEvent(payload: SecurityEventCreateInput): Promise<SecurityEventLogResponse> {
    const endpoint = `${BASE_PATH}/log`;
    const sanitizedPayload = sanitizeEventPayload(payload);

    try {
      const response = await api.post<ApiResponse<SecurityEventLogResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to log security event',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityEventsLogContext('POST', endpoint, {
          eventType: sanitizedPayload.eventType,
          severity: sanitizedPayload.severity
        })
      );
    }
  },

  /**
   * Log an authentication attempt security event.
   * POST /api/security/events/log-auth
   */
  async logAuthenticationAttempt(payload: LogAuthAttemptPayload): Promise<SecurityAuthAttemptResponse> {
    const endpoint = `${BASE_PATH}/log-auth`;
    const sanitizedPayload = sanitizeAuthAttemptPayload(payload);

    try {
      const response = await api.post<ApiResponse<SecurityAuthAttemptResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to log authentication attempt',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityEventsLogContext('POST', endpoint, {
          userId: sanitizedPayload.userId,
          success: sanitizedPayload.success
        })
      );
    }
  },

  /**
   * Retrieve recent events for a user.
   * GET /api/security/events/recent
   */
  async getRecentEvents(query?: EventsQueryParams): Promise<SecurityEventsEnvelope> {
    const endpoint = `${BASE_PATH}/recent`;
    const params = sanitizeEventsQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityEventsEnvelope>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch recent security events',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityEventsLogContext('GET', endpoint, {
          hasUserContext: Boolean(query?.userId),
          limit: query?.limit
        })
      );
    }
  },

  /**
   * Retrieve events for a user since a specific window.
   * GET /api/security/events/user/since
   */
  async getUserEventsSince(query?: EventsSinceQueryParams): Promise<SecurityEventsEnvelope> {
    const endpoint = `${BASE_PATH}/user/since`;
    const params = sanitizeEventsSinceQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityEventsEnvelope>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch user security events',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityEventsLogContext('GET', endpoint, {
          hasUserContext: Boolean(query?.userId),
          days: query?.days
        })
      );
    }
  },

  /**
   * Retrieve system events for dashboards.
   * GET /api/security/events/system
   */
  async getSystemEvents(query?: SystemEventsQueryParams): Promise<SecurityEventsEnvelope> {
    const endpoint = `${BASE_PATH}/system`;
    const params = sanitizeSystemEventsQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityEventsEnvelope>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch system security events',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityEventsLogContext('GET', endpoint, {
          days: query?.days
        })
      );
    }
  }
};

export default securityEventsApi;

