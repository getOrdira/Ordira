// src/lib/api/features/connections/connectionsInvitations.api.ts
// Connections invitations API module aligned with backend routes/features/connections/connectionsInvitations.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BulkInviteResult,
  ConnectionStats,
  InvitationSummary
} from '@backend/services/connections/features/invitations.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeObjectId
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/connections/invitations';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createInvitationsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'connections',
  module: 'invitations',
  method,
  endpoint,
  ...context
});

const INVITATION_TYPES = ['collaboration', 'manufacturing', 'partnership', 'custom'] as const;

type InvitationType = typeof INVITATION_TYPES[number];
type InvitationEntityType = 'brand' | 'manufacturer';

export interface SendInvitationPayload {
  manufacturerId: string;
  invitationType?: InvitationType;
  message?: string;
  terms?: Record<string, unknown>;
}

export interface BulkInvitationPayload {
  manufacturerIds: string[];
  invitationType?: InvitationType;
  message?: string;
}

export interface InvitationResponsePayload {
  inviteId: string;
  accept: boolean;
  message?: string;
}

export interface InvitationActivityQuery {
  entityType?: InvitationEntityType;
  entityId?: string;
  limit?: number;
}

export interface ConnectionStatusParams {
  brandId: string;
  manufacturerId: string;
}

const sanitizeSendInvitationPayload = (payload: SendInvitationPayload) => {
  const manufacturerId = sanitizeObjectId(payload.manufacturerId, 'manufacturerId');
  const invitationType = sanitizeOptionalEnum(payload.invitationType, 'invitationType', INVITATION_TYPES);
  const message = sanitizeOptionalString(payload.message, 'message', {
    maxLength: 1000,
    allowEmpty: true
  });
  const terms = sanitizeOptionalJsonObject<Record<string, unknown>>(payload.terms, 'terms');

  return baseApi.sanitizeRequestData({
    manufacturerId,
    invitationType,
    message,
    terms
  });
};

const sanitizeBulkInvitationPayload = (payload: BulkInvitationPayload) => {
  const manufacturerIds = sanitizeArray(
    payload.manufacturerIds,
    'manufacturerIds',
    (value, index) => sanitizeObjectId(value, `manufacturerIds[${index}]`),
    { minLength: 1, maxLength: 100 }
  );

  const invitationType = sanitizeOptionalEnum(payload.invitationType, 'invitationType', INVITATION_TYPES);
  const message = sanitizeOptionalString(payload.message, 'message', {
    maxLength: 1000,
    allowEmpty: true
  });

  return baseApi.sanitizeRequestData({
    manufacturerIds,
    invitationType,
    message
  });
};

const sanitizeInvitationResponsePayload = (payload: InvitationResponsePayload) => {
  const inviteId = sanitizeObjectId(payload.inviteId, 'inviteId');
  const accept = sanitizeBoolean(payload.accept, 'accept');
  const message = sanitizeOptionalString(payload.message, 'message', {
    maxLength: 1000,
    allowEmpty: true
  });

  return baseApi.sanitizeRequestData({
    inviteId,
    accept,
    message
  });
};

const sanitizeActivityQuery = (params?: InvitationActivityQuery) => {
  if (!params) {
    return undefined;
  }

  const query = {
    entityType: sanitizeOptionalEnum<InvitationEntityType>(params.entityType, 'entityType', ['brand', 'manufacturer']),
    entityId: sanitizeOptionalObjectId(params.entityId, 'entityId'),
    limit: sanitizeOptionalNumber(params.limit, 'limit', { integer: true, min: 1, max: 50 })
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const sanitizeConnectionStatusParams = (params: ConnectionStatusParams) => {
  const brandId = sanitizeObjectId(params.brandId, 'brandId');
  const manufacturerId = sanitizeObjectId(params.manufacturerId, 'manufacturerId');

  return { brandId, manufacturerId };
};

export const connectionsInvitationsApi = {
  /**
   * Send an invitation from a brand to a manufacturer.
   * POST /connections/invitations
   */
  async sendInvitation(payload: SendInvitationPayload): Promise<InvitationSummary> {
    try {
      const sanitizedPayload = sanitizeSendInvitationPayload(payload);
      const response = await api.post<ApiResponse<{ invitation: InvitationSummary }>>(
        BASE_PATH,
        sanitizedPayload
      );
      const { invitation } = baseApi.handleResponse(
        response,
        'Failed to send invitation',
        400
      );
      return invitation;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('POST', BASE_PATH, {
          manufacturerId: payload.manufacturerId,
          invitationType: payload.invitationType
        })
      );
    }
  },

  /**
   * Send invitations to multiple manufacturers in a single request.
   * POST /connections/invitations/bulk
   */
  async bulkInvite(payload: BulkInvitationPayload): Promise<BulkInviteResult> {
    try {
      const sanitizedPayload = sanitizeBulkInvitationPayload(payload);
      const response = await api.post<ApiResponse<{ result: BulkInviteResult }>>(
        `${BASE_PATH}/bulk`,
        sanitizedPayload
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to process bulk invitations',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('POST', `${BASE_PATH}/bulk`, {
          total: payload.manufacturerIds?.length ?? 0,
          invitationType: payload.invitationType
        })
      );
    }
  },

  /**
   * Respond to an invitation as a manufacturer.
   * POST /connections/invitations/respond
   */
  async respondInvitation(payload: InvitationResponsePayload): Promise<InvitationSummary> {
    try {
      const sanitizedPayload = sanitizeInvitationResponsePayload(payload);
      const response = await api.post<ApiResponse<{ invitation: InvitationSummary }>>(
        `${BASE_PATH}/respond`,
        sanitizedPayload
      );
      const { invitation } = baseApi.handleResponse(
        response,
        'Failed to respond to invitation',
        400
      );
      return invitation;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('POST', `${BASE_PATH}/respond`, {
          inviteId: payload.inviteId,
          accept: payload.accept
        })
      );
    }
  },

  /**
   * Cancel a pending invitation initiated by the authenticated brand.
   * DELETE /connections/invitations/:inviteId
   */
  async cancelInvitation(inviteId: string): Promise<boolean> {
    const id = sanitizeObjectId(inviteId, 'inviteId');

    try {
      const response = await api.delete<ApiResponse<{ cancelled?: boolean }>>(
        `${BASE_PATH}/${id}`
      );
      const { cancelled = true } = baseApi.handleResponse(
        response,
        'Failed to cancel invitation',
        400,
        { requireData: false }
      ) ?? {};
      return cancelled;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('DELETE', `${BASE_PATH}/:inviteId`, { inviteId: id })
      );
    }
  },

  /**
   * Retrieve invitation details by identifier.
   * GET /connections/invitations/:inviteId
   */
  async getInvitation(inviteId: string): Promise<InvitationSummary> {
    const id = sanitizeObjectId(inviteId, 'inviteId');

    try {
      const response = await api.get<ApiResponse<{ invitation: InvitationSummary }>>(
        `${BASE_PATH}/${id}`
      );
      const { invitation } = baseApi.handleResponse(
        response,
        'Failed to fetch invitation details',
        404
      );
      return invitation;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/:inviteId`, { inviteId: id })
      );
    }
  },

  /**
   * List invitations for the authenticated brand.
   * GET /connections/invitations/brand
   */
  async listBrandInvitations(): Promise<InvitationSummary[]> {
    try {
      const response = await api.get<ApiResponse<{ invitations: InvitationSummary[] }>>(
        `${BASE_PATH}/brand`
      );
      const { invitations } = baseApi.handleResponse(
        response,
        'Failed to fetch brand invitations',
        500
      );
      return invitations;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/brand`)
      );
    }
  },

  /**
   * List pending invitations for the authenticated brand.
   * GET /connections/invitations/brand/pending
   */
  async listPendingBrandInvitations(): Promise<InvitationSummary[]> {
    try {
      const response = await api.get<ApiResponse<{ invitations: InvitationSummary[] }>>(
        `${BASE_PATH}/brand/pending`
      );
      const { invitations } = baseApi.handleResponse(
        response,
        'Failed to fetch pending brand invitations',
        500
      );
      return invitations;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/brand/pending`)
      );
    }
  },

  /**
   * Retrieve connection statistics for the authenticated brand.
   * GET /connections/invitations/brand/stats
   */
  async getBrandConnectionStats(): Promise<ConnectionStats> {
    try {
      const response = await api.get<ApiResponse<{ stats: ConnectionStats }>>(
        `${BASE_PATH}/brand/stats`
      );
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch brand connection stats',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/brand/stats`)
      );
    }
  },

  /**
   * Retrieve connected manufacturer identifiers for the authenticated brand.
   * GET /connections/invitations/brand/connected-manufacturers
   */
  async getConnectedManufacturers(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<{ manufacturerIds: string[] }>>(
        `${BASE_PATH}/brand/connected-manufacturers`
      );
      const { manufacturerIds } = baseApi.handleResponse(
        response,
        'Failed to fetch connected manufacturers',
        500
      );
      return manufacturerIds;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/brand/connected-manufacturers`)
      );
    }
  },

  /**
   * List invitations for the authenticated manufacturer.
   * GET /connections/invitations/manufacturer
   */
  async listManufacturerInvitations(): Promise<InvitationSummary[]> {
    try {
      const response = await api.get<ApiResponse<{ invitations: InvitationSummary[] }>>(
        `${BASE_PATH}/manufacturer`
      );
      const { invitations } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer invitations',
        500
      );
      return invitations;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/manufacturer`)
      );
    }
  },

  /**
   * List pending invitations for the authenticated manufacturer.
   * GET /connections/invitations/manufacturer/pending
   */
  async listPendingManufacturerInvitations(): Promise<InvitationSummary[]> {
    try {
      const response = await api.get<ApiResponse<{ invitations: InvitationSummary[] }>>(
        `${BASE_PATH}/manufacturer/pending`
      );
      const { invitations } = baseApi.handleResponse(
        response,
        'Failed to fetch pending manufacturer invitations',
        500
      );
      return invitations;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/manufacturer/pending`)
      );
    }
  },

  /**
   * Retrieve connection statistics for the authenticated manufacturer.
   * GET /connections/invitations/manufacturer/stats
   */
  async getManufacturerConnectionStats(): Promise<ConnectionStats> {
    try {
      const response = await api.get<ApiResponse<{ stats: ConnectionStats }>>(
        `${BASE_PATH}/manufacturer/stats`
      );
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer connection stats',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/manufacturer/stats`)
      );
    }
  },

  /**
   * Retrieve connected brand identifiers for the authenticated manufacturer.
   * GET /connections/invitations/manufacturer/connected-brands
   */
  async getConnectedBrands(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<{ brandIds: string[] }>>(
        `${BASE_PATH}/manufacturer/connected-brands`
      );
      const { brandIds } = baseApi.handleResponse(
        response,
        'Failed to fetch connected brands',
        500
      );
      return brandIds;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/manufacturer/connected-brands`)
      );
    }
  },

  /**
   * Check connection status for a brand/manufacturer pair.
   * GET /connections/invitations/status/:brandId/:manufacturerId
   */
  async checkConnectionStatus(params: ConnectionStatusParams): Promise<boolean> {
    const { brandId, manufacturerId } = sanitizeConnectionStatusParams(params);

    try {
      const response = await api.get<ApiResponse<{ connected: boolean }>>(
        `${BASE_PATH}/status/${brandId}/${manufacturerId}`
      );
      const { connected } = baseApi.handleResponse(
        response,
        'Failed to check connection status',
        500
      );
      return connected;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/status/:brandId/:manufacturerId`, {
          brandId,
          manufacturerId
        })
      );
    }
  },

  /**
   * Remove the connection between the authenticated brand and a manufacturer.
   * DELETE /connections/invitations/connections/:manufacturerId
   */
  async removeConnection(manufacturerId: string): Promise<boolean> {
    const id = sanitizeObjectId(manufacturerId, 'manufacturerId');

    try {
      const response = await api.delete<ApiResponse<{ removed?: boolean }>>(
        `${BASE_PATH}/connections/${id}`
      );
      const { removed = true } = baseApi.handleResponse(
        response,
        'Failed to remove connection',
        400,
        { requireData: false }
      ) ?? {};
      return removed;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('DELETE', `${BASE_PATH}/connections/:manufacturerId`, {
          manufacturerId: id
        })
      );
    }
  },

  /**
   * Retrieve recent invitation activity for the authenticated entity.
   * GET /connections/invitations/activity
   */
  async getRecentActivity(params?: InvitationActivityQuery): Promise<InvitationSummary[]> {
    try {
      const query = sanitizeActivityQuery(params);
      const response = await api.get<ApiResponse<{ activity: InvitationSummary[] }>>(
        `${BASE_PATH}/activity`,
        { params: query }
      );
      const { activity } = baseApi.handleResponse(
        response,
        'Failed to fetch recent invitation activity',
        500
      );
      return activity;
    } catch (error) {
      throw handleApiError(
        error,
        createInvitationsLogContext('GET', `${BASE_PATH}/activity`, params ? { params } : undefined)
      );
    }
  }
};

export default connectionsInvitationsApi;
