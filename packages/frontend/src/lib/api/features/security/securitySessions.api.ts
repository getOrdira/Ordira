// src/lib/api/features/security/securitySessions.api.ts
// Security sessions API aligned with backend routes/features/security/securitySessions.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SecurityActorType,
  SessionCleanupResponse,
  SessionCountResponse,
  SessionCreationResponse,
  SessionCreateInput,
  SessionInfo,
  SessionRevokeResponse,
  SessionsRevokeAllResponse,
  SessionActivityUpdateResponse
} from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeEnum,
  sanitizeBoolean,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeOptionalDate,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/sessions';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

const SECURITY_ACTOR_TYPES: readonly SecurityActorType[] = ['business', 'user', 'manufacturer'] as const;
const SESSION_ID_REGEX = /^[a-zA-Z0-9:_-]{8,200}$/;
const IP_ADDRESS_REGEX =
  /^(?:\d{1,3}\.){3}\d{1,3}$|^(?:[A-Fa-f0-9:]+:+[A-Fa-f0-9]+)$/;

const createSecuritySessionsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'sessions',
  method,
  endpoint,
  ...context
});

export interface RevokeAllSessionsPayload {
  userId?: string;
  userType?: SecurityActorType;
  reason?: string;
  excludeSessionId?: string;
}

export interface ActiveSessionsQuery {
  userId?: string;
  userType?: SecurityActorType;
}

export interface CleanupExpiredSessionsQuery {
  referenceDate?: string | Date;
}

export interface RecentSessionsQuery {
  userId?: string;
  days?: number;
}

const sanitizeSessionId = (sessionId: string) =>
  sanitizeString(sessionId, 'sessionId', {
    pattern: SESSION_ID_REGEX,
    trim: true
  });

const sanitizeSessionCreatePayload = (payload: SessionCreateInput) => {
  const expiresAt = sanitizeOptionalDate(payload.expiresAt, 'expiresAt');
  const createdAt = sanitizeOptionalDate(payload.createdAt, 'createdAt');
  const lastActivity = sanitizeOptionalDate(payload.lastActivity, 'lastActivity');

  return baseApi.sanitizeRequestData({
    userId: sanitizeObjectId(payload.userId, 'userId'),
    userType: sanitizeEnum(payload.userType, 'userType', SECURITY_ACTOR_TYPES),
    tokenId: sanitizeString(payload.tokenId, 'tokenId', { trim: true, maxLength: 200 }),
    ipAddress: sanitizeString(payload.ipAddress, 'ipAddress', {
      trim: true,
      maxLength: 200,
      pattern: IP_ADDRESS_REGEX
    }),
    userAgent: sanitizeString(payload.userAgent, 'userAgent', { trim: true, maxLength: 500 }),
    deviceFingerprint: sanitizeOptionalString(payload.deviceFingerprint, 'deviceFingerprint', {
      trim: true,
      maxLength: 200
    }),
    expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
    createdAt: createdAt ? createdAt.toISOString() : undefined,
    lastActivity: lastActivity ? lastActivity.toISOString() : undefined,
    isActive: sanitizeOptionalBoolean(payload.isActive, 'isActive')
  });
};

const sanitizeRevokeAllPayload = (payload: RevokeAllSessionsPayload) => {
  return baseApi.sanitizeRequestData({
    userId: sanitizeOptionalObjectId(payload.userId, 'userId'),
    userType: sanitizeOptionalEnum(payload.userType, 'userType', SECURITY_ACTOR_TYPES),
    reason: sanitizeOptionalString(payload.reason, 'reason', { trim: true, maxLength: 500 }),
    excludeSessionId: payload.excludeSessionId
      ? sanitizeSessionId(payload.excludeSessionId)
      : undefined
  });
};

const sanitizeActiveSessionsQuery = (query?: ActiveSessionsQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    userId: sanitizeOptionalObjectId(query.userId, 'userId'),
    userType: sanitizeOptionalEnum(query.userType, 'userType', SECURITY_ACTOR_TYPES)
  });
};

const sanitizeCleanupQuery = (query?: CleanupExpiredSessionsQuery) => {
  if (!query) {
    return undefined;
  }

  const referenceDate = sanitizeOptionalDate(query.referenceDate, 'referenceDate');

  return baseApi.sanitizeQueryParams({
    referenceDate: referenceDate ? referenceDate.toISOString() : undefined
  });
};

const sanitizeRecentSessionsQuery = (query?: RecentSessionsQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    userId: sanitizeOptionalObjectId(query.userId, 'userId'),
    days: sanitizeOptionalNumber(query.days, 'days', { integer: true, min: 1, max: 30 })
  });
};

export const securitySessionsApi = {
  /**
   * Create a new security session.
   * POST /api/security/sessions
   */
  async createSession(payload: SessionCreateInput): Promise<SessionCreationResponse> {
    const endpoint = BASE_PATH;
    const sanitizedPayload = sanitizeSessionCreatePayload(payload);

    try {
      const response = await api.post<ApiResponse<SessionCreationResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to create security session',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('POST', endpoint, {
          userId: sanitizedPayload.userId
        })
      );
    }
  },

  /**
   * Update the activity timestamp for a session.
   * PATCH /api/security/sessions/:sessionId/activity
   */
  async updateSessionActivity(sessionId: string): Promise<SessionActivityUpdateResponse> {
    const sanitizedSessionId = sanitizeSessionId(sessionId);
    const endpoint = `${BASE_PATH}/${sanitizedSessionId}/activity`;

    try {
      const response = await api.patch<ApiResponse<SessionActivityUpdateResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to update session activity',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('PATCH', `${BASE_PATH}/:sessionId/activity`, {
          sessionId: sanitizedSessionId
        })
      );
    }
  },

  /**
   * Revoke a specific session.
   * POST /api/security/sessions/:sessionId/revoke
   */
  async revokeSession(sessionId: string): Promise<SessionRevokeResponse> {
    const sanitizedSessionId = sanitizeSessionId(sessionId);
    const endpoint = `${BASE_PATH}/${sanitizedSessionId}/revoke`;

    try {
      const response = await api.post<ApiResponse<SessionRevokeResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to revoke session',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('POST', `${BASE_PATH}/:sessionId/revoke`, {
          sessionId: sanitizedSessionId
        })
      );
    }
  },

  /**
   * Revoke all sessions for a user.
   * POST /api/security/sessions/revoke-all
   */
  async revokeAllSessions(payload: RevokeAllSessionsPayload): Promise<SessionsRevokeAllResponse> {
    const endpoint = `${BASE_PATH}/revoke-all`;
    const sanitizedPayload = sanitizeRevokeAllPayload(payload);

    try {
      const response = await api.post<ApiResponse<SessionsRevokeAllResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to revoke sessions',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('POST', endpoint, {
          userId: sanitizedPayload.userId
        })
      );
    }
  },

  /**
   * Retrieve active sessions for a user.
   * GET /api/security/sessions/active
   */
  async getActiveSessions(query?: ActiveSessionsQuery): Promise<{ userId: string; sessions: SessionInfo[] }> {
    const endpoint = `${BASE_PATH}/active`;
    const params = sanitizeActiveSessionsQuery(query);

    try {
      const response = await api.get<ApiResponse<{ userId: string; sessions: SessionInfo[] }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch active sessions',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('GET', endpoint, {
          hasUserContext: Boolean(query?.userId)
        })
      );
    }
  },

  /**
   * Cleanup expired sessions.
   * POST /api/security/sessions/cleanup
   */
  async cleanupExpiredSessions(query?: CleanupExpiredSessionsQuery): Promise<SessionCleanupResponse> {
    const endpoint = `${BASE_PATH}/cleanup`;
    const params = sanitizeCleanupQuery(query);

    try {
      const response = await api.post<ApiResponse<SessionCleanupResponse>>(endpoint, undefined, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to cleanup expired sessions',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('POST', endpoint, {
          referenceDate: query?.referenceDate instanceof Date
            ? query.referenceDate.toISOString()
            : query?.referenceDate
        })
      );
    }
  },

  /**
   * Count recent sessions within a timeframe.
   * GET /api/security/sessions/recent/count
   */
  async countRecentSessions(query?: RecentSessionsQuery): Promise<SessionCountResponse> {
    const endpoint = `${BASE_PATH}/recent/count`;
    const params = sanitizeRecentSessionsQuery(query);

    try {
      const response = await api.get<ApiResponse<SessionCountResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to count recent sessions',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecuritySessionsLogContext('GET', endpoint, {
          hasUserContext: Boolean(query?.userId),
          days: query?.days
        })
      );
    }
  }
};

export default securitySessionsApi;

