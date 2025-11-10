// src/lib/api/features/security/securityTokens.api.ts
// Security tokens API aligned with backend routes/features/security/securityTokens.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SecurityActorType,
  TokenBlacklistResponse,
  TokenBlacklistStatusResponse
} from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalEnum,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/tokens';

type HttpMethod = 'GET' | 'POST';

const SECURITY_ACTOR_TYPES: readonly SecurityActorType[] = ['business', 'user', 'manufacturer'] as const;

const createSecurityTokensLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'tokens',
  method,
  endpoint,
  ...context
});

export interface BlacklistTokenPayload {
  token: string;
  userId?: string;
  userType?: SecurityActorType;
  reason?: string;
}

export interface TokenQueryPayload {
  token: string;
}

const sanitizeBlacklistPayload = (payload: BlacklistTokenPayload) => {
  return baseApi.sanitizeRequestData({
    token: sanitizeString(payload.token, 'token', { trim: true, minLength: 16 }),
    userId: sanitizeOptionalObjectId(payload.userId, 'userId'),
    userType: sanitizeOptionalEnum(payload.userType, 'userType', SECURITY_ACTOR_TYPES),
    reason: sanitizeOptionalString(payload.reason, 'reason', { trim: true, maxLength: 500 })
  });
};

const sanitizeTokenQuery = (payload: TokenQueryPayload) => {
  return baseApi.sanitizeQueryParams({
    token: sanitizeString(payload.token, 'token', { trim: true, minLength: 16 })
  });
};

export const securityTokensApi = {
  /**
   * Blacklist a token.
   * POST /api/security/tokens/blacklist
   */
  async blacklistToken(payload: BlacklistTokenPayload): Promise<TokenBlacklistResponse> {
    const endpoint = `${BASE_PATH}/blacklist`;
    const sanitizedPayload = sanitizeBlacklistPayload(payload);

    try {
      const response = await api.post<ApiResponse<TokenBlacklistResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to blacklist token',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityTokensLogContext('POST', endpoint, {
          hasUserContext: Boolean(sanitizedPayload.userId)
        })
      );
    }
  },

  /**
   * Determine whether a token is blacklisted.
   * GET /api/security/tokens/is-blacklisted
   */
  async isTokenBlacklisted(payload: TokenQueryPayload): Promise<TokenBlacklistStatusResponse> {
    const endpoint = `${BASE_PATH}/is-blacklisted`;
    const params = sanitizeTokenQuery(payload);

    try {
      const response = await api.get<ApiResponse<TokenBlacklistStatusResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch token blacklist status',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityTokensLogContext('GET', endpoint)
      );
    }
  }
};

export default securityTokensApi;




