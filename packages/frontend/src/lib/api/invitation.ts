// src/lib/api/invitation.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

export interface Invitation {
  _id: string;
  business: string; // Types.ObjectId as string (inviter business/brand)
  email: string; // Invitee email
  role: 'manufacturer' | 'brand'; // Role for invitee (for sharing voting data, proposals)
  code: string; // Unique invitation code
  status: 'pending' | 'accepted' | 'declined' | 'expired'; // Status tracking
  sentAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  expiresAt?: Date; // Optional expiry
  message?: string; // Custom invitation message
  sharedData?: string[]; // e.g., ['voting', 'products', 'analytics'] - what data to share on accept
  createdAt: Date;
  updatedAt: Date;
}

// For send response (may include code for UI/email)
export interface SendInvitationResponse {
  invitation: Invitation;
  success: boolean;
  message?: string; // e.g., 'Invitation sent successfully'
}

// Response interface for invitation overview
export interface InvitationOverviewResponse {
  success: boolean;
  message: string;
  data: {
    userType: 'brand' | 'manufacturer';
    userId: string;
    overview: {
      totalInvitations: number;
      pendingInvitations: number;
      acceptedInvitations: number;
      declinedInvitations: number;
      recentActivity: any[];
    };
    features: {
      sendInvitations: boolean;
      respondToInvitations: boolean;
      viewAnalytics: boolean;
      bulkOperations: boolean;
    };
    limits: {
      maxPendingInvitations: number;
    };
  };
}

/**
 * Gets invitation system overview (works for both brands and manufacturers)
 * @returns Promise<InvitationOverviewResponse>
 */
export const getInvitationOverview = async (): Promise<InvitationOverviewResponse> => {
  try {
    const response = await apiClient.get<InvitationOverviewResponse>('/api/invitations');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch invitation overview', error);
  }
};

// ===== BRAND INVITATION FUNCTIONS =====

/**
 * Sends invitation as a brand to manufacturer.
 * @param data - Invitation data
 * @returns Promise<SendInvitationResponse>
 */
export const sendInvitation = async (data: {
  email: string;
  role: 'manufacturer' | 'brand';
  message?: string;
  sharedData?: string[]; // e.g., ['voting', 'products']
}): Promise<SendInvitationResponse> => {
  try {
    const response = await apiClient.post<SendInvitationResponse>('/api/invitations/brand', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to send invitation', error);
  }
};

/**
 * Fetches list of invitations sent by brand.
 * @param status - Optional filter by status
 * @returns Promise<Invitation[]>
 */
export const getBrandInvitations = async (status?: Invitation['status']): Promise<Invitation[]> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {invitations: Invitation[]}}>('/api/invitations/brand', {
      params: { status },
    });
    return response.data.data.invitations;
  } catch (error) {
    throw new ApiError('Failed to fetch brand invitations', error);
  }
};

/**
 * Fetches a single invitation by ID (brand perspective).
 * @param inviteId - Invitation ID
 * @returns Promise<Invitation>
 */
export const getBrandInvitationById = async (inviteId: string): Promise<Invitation> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {invitation: Invitation}}>(`/api/invitations/brand/${inviteId}`);
    return response.data.data.invitation;
  } catch (error) {
    throw new ApiError('Failed to fetch brand invitation by ID', error);
  }
};

/**
 * Updates invitation terms (brand only, before acceptance).
 * @param inviteId - Invitation ID
 * @param data - Updated invitation data
 * @returns Promise<Invitation>
 */
export const updateInvitation = async (inviteId: string, data: {
  message?: string;
  sharedData?: string[];
  expiresAt?: Date;
}): Promise<Invitation> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {invitation: Invitation}}>(`/api/invitations/brand/${inviteId}`, data);
    return response.data.data.invitation;
  } catch (error) {
    throw new ApiError('Failed to update invitation', error);
  }
};

/**
 * Cancels/deletes an invitation (brand only).
 * @param inviteId - Invitation ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteInvitation = async (inviteId: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(`/api/invitations/brand/${inviteId}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to delete invitation', error);
  }
};

// ===== MANUFACTURER INVITATION FUNCTIONS =====

/**
 * Fetches list of invitations received by manufacturer.
 * @param status - Optional filter by status
 * @returns Promise<Invitation[]>
 */
export const getManufacturerInvitations = async (status?: Invitation['status']): Promise<Invitation[]> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {invitations: Invitation[]}}>('/api/invitations/manufacturer', {
      params: { status },
    });
    return response.data.data.invitations;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer invitations', error);
  }
};

/**
 * Fetches a single invitation by ID (manufacturer perspective).
 * @param inviteId - Invitation ID
 * @returns Promise<Invitation>
 */
export const getManufacturerInvitationById = async (inviteId: string): Promise<Invitation> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {invitation: Invitation}}>(`/api/invitations/manufacturer/${inviteId}`);
    return response.data.data.invitation;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer invitation by ID', error);
  }
};

/**
 * Responds to an invitation (manufacturer only).
 * @param inviteId - Invitation ID
 * @param accept - Whether to accept or decline
 * @param note - Optional response note
 * @returns Promise<Invitation>
 */
export const respondToInvitation = async (inviteId: string, accept: boolean, note?: string): Promise<Invitation> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {invitation: Invitation}}>(`/api/invitations/manufacturer/${inviteId}/respond`, { 
      accept,
      note 
    });
    return response.data.data.invitation;
  } catch (error) {
    throw new ApiError('Failed to respond to invitation', error);
  }
};

/**
 * Submits counter-offer for invitation (manufacturer only).
 * @param inviteId - Invitation ID
 * @param counterOffer - Counter offer terms
 * @param note - Optional note
 * @returns Promise<Invitation>
 */
export const submitCounterOffer = async (inviteId: string, counterOffer: {
  commission?: number;
  minimumOrderQuantity?: number;
  deliveryTimeframe?: string;
  additionalTerms?: string;
}, note?: string): Promise<Invitation> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {invitation: Invitation}}>(`/api/invitations/manufacturer/${inviteId}/counter-offer`, {
      counterOffer,
      note
    });
    return response.data.data.invitation;
  } catch (error) {
    throw new ApiError('Failed to submit counter-offer', error);
  }
};

/**
 * Gets manufacturer invitation analytics.
 * @param params - Optional analytics parameters
 * @returns Promise<any>
 */
export const getManufacturerInvitationAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: 'daily' | 'weekly' | 'monthly';
  includeResponseTimes?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/invitations/manufacturer/analytics', {
      params,
    });
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer invitation analytics', error);
  }
};

// ===== SHARED FUNCTIONS (Both brands and manufacturers) =====

/**
 * Fetches a single invitation by ID (accessible to both parties).
 * @param inviteId - Invitation ID
 * @returns Promise<Invitation>
 */
export const getInvitationByCode = async (inviteId: string): Promise<Invitation> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {invitation: Invitation}}>(`/api/invitations/${inviteId}`);
    return response.data.data.invitation;
  } catch (error) {
    throw new ApiError('Failed to fetch invitation by ID', error);
  }
};

/**
 * Disconnects from a partner (both brands and manufacturers).
 * @param partnerId - Partner ID to disconnect from
 * @returns Promise<{ success: boolean }>
 */
export const disconnectPartner = async (partnerId: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(`/api/invitations/disconnect/${partnerId}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to disconnect partner', error);
  }
};

/**
 * Gets invitation notification preferences.
 * @returns Promise<any>
 */
export const getInvitationNotificationPreferences = async (): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/invitations/notifications');
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch invitation notification preferences', error);
  }
};

/**
 * Updates invitation notification preferences.
 * @param preferences - Updated preferences
 * @returns Promise<any>
 */
export const updateInvitationNotificationPreferences = async (preferences: {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  invitationReminders?: boolean;
  responseNotifications?: boolean;
  connectionUpdates?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.put<{success: boolean; data: any}>('/api/invitations/notifications', preferences);
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to update invitation notification preferences', error);
  }
};

// Legacy functions for backward compatibility (deprecated - use specific brand/manufacturer functions)
export const getInvitations = getBrandInvitations;
export const acceptInvitation = (code: string) => respondToInvitation(code, true);
export const rejectInvitation = (code: string, reason?: string) => respondToInvitation(code, false, reason);
