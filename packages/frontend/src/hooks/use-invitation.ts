// src/hooks/use-invitation.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import apiClient from '@/lib/api/client';
import { ApiError } from '@/lib/errors';

// Types aligned with backend responses
interface Invitation {
  _id: string;
  brand: string;
  manufacturer: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected';
  message?: string;
  expiresAt: Date;
  respondedAt?: Date;
  invitationType: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
  terms?: {
    proposedCommission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    specialRequirements?: string[];
  };
  responseMessage?: string;
  counterOffer?: {
    commission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    additionalTerms?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface InvitationOverviewResponse {
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

interface InvitationListResponse {
  success: boolean;
  message: string;
  data: {
    invitations: Invitation[];
    stats: {
      totalConnections: number;
      pendingInvitations: number;
      acceptedInvitations: number;
      declinedInvitations: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
}

interface InvitationDetailsResponse {
  success: boolean;
  message: string;
  data: {
    invitation: {
      id: string;
      brandId: string;
      manufacturerId: string;
      status: string;
      message?: string;
      createdAt: string;
      expiresAt: string;
      respondedAt?: string;
      invitationType: string;
      terms?: any;
      counterOffer?: any;
    };
  };
}

interface SendInvitationRequest {
  manufacturerId: string;
  message?: string;
  invitationType?: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
  terms?: {
    proposedCommission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    specialRequirements?: string[];
  };
}

interface RespondToInvitationRequest {
  accept: boolean;
  responseMessage?: string;
  counterOffer?: {
    commission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    additionalTerms?: string;
  };
}

interface InvitationStatsResponse {
  success: boolean;
  data: {
    userType: 'brand' | 'manufacturer';
    userId: string;
    timeframe: number;
    breakdown: string;
    statistics: {
      overview: {
        totalInvitations: number;
        pendingInvitations: number;
        acceptedInvitations: number;
        declinedInvitations: number;
        responseRate: number;
        avgResponseTime: string;
      };
      trends: any[];
      performance: {
        quickResponses: number;
        standardResponses: number;
        slowResponses: number;
        noResponse?: number;
      };
    };
  };
}

interface ConnectionsResponse {
  success: boolean;
  data: {
    userType: 'brand' | 'manufacturer';
    connections: {
      active: any[];
      pending: any[];
      recent: any[];
    };
    stats: {
      totalConnections: number;
      newThisMonth: number;
      responseRate: number;
    };
    actions: {
      canInvite: boolean;
      canRespond: boolean;
      canManageConnections: boolean;
    };
  };
}

// API functions aligned with backend routes
const invitationApi = {
  // GET /api/invitations - Get invitation overview
  getOverview: async (): Promise<InvitationOverviewResponse> => {
    return apiClient.get<InvitationOverviewResponse>('/api/invitations');
  },

  // GET /api/invitations/brand - List invitations for brand
  getBrandInvitations: async (): Promise<InvitationListResponse> => {
    return apiClient.get<InvitationListResponse>('/api/invitations/brand');
  },

  // GET /api/invitations/manufacturer - List invitations for manufacturer
  getManufacturerInvitations: async (): Promise<InvitationListResponse> => {
    return apiClient.get<InvitationListResponse>('/api/invitations/manufacturer');
  },

  // GET /api/invitations/:inviteId - Get invitation details
  getInvitationById: async (inviteId: string): Promise<InvitationDetailsResponse> => {
    return apiClient.get<InvitationDetailsResponse>(`/api/invitations/${inviteId}`);
  },

  // POST /api/invitations/brand - Send invitation as brand
  sendInvitation: async (data: SendInvitationRequest): Promise<{ success: boolean; data: { invitation: any } }> => {
    return apiClient.post<{ success: boolean; data: { invitation: any } }>('/api/invitations/brand', data);
  },

  // POST /api/invitations/manufacturer/:inviteId/respond - Respond to invitation as manufacturer
  respondToInvitation: async (inviteId: string, data: RespondToInvitationRequest): Promise<{ success: boolean; data: { invitation: any; action: string } }> => {
    return apiClient.post<{ success: boolean; data: { invitation: any; action: string } }>(`/api/invitations/manufacturer/${inviteId}/respond`, data);
  },

  // DELETE /api/invitations/:inviteId - Cancel/delete invitation
  deleteInvitation: async (inviteId: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/api/invitations/${inviteId}`);
  },

  // GET /api/invitations/stats - Get invitation statistics
  getInvitationStats: async (params?: { timeframe?: number; breakdown?: string }): Promise<InvitationStatsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.timeframe) queryParams.set('timeframe', params.timeframe.toString());
    if (params?.breakdown) queryParams.set('breakdown', params.breakdown);
    
    return apiClient.get<InvitationStatsResponse>(`/api/invitations/stats?${queryParams.toString()}`);
  },

  // GET /api/invitations/connections - Get connections overview
  getConnections: async (): Promise<ConnectionsResponse> => {
    return apiClient.get<ConnectionsResponse>('/api/invitations/connections');
  },
};

export const useInvitation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query for invitation overview (determines user type and permissions)
  const { data: invitationOverview, isLoading: isLoadingOverview, error: overviewError } = useQuery<InvitationOverviewResponse, ApiError>({
    queryKey: ['invitationOverview', user?._id],
    queryFn: invitationApi.getOverview,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Determine user type from overview
  const userType = invitationOverview?.data?.userType;
  const canSendInvitations = invitationOverview?.data?.features?.sendInvitations ?? false;
  const canRespondToInvitations = invitationOverview?.data?.features?.respondToInvitations ?? false;

  // Query for invitation list (brand or manufacturer specific)
  const { data: invitationList, isLoading: isLoadingInvitations, error: invitationsError } = useQuery<InvitationListResponse, ApiError>({
    queryKey: ['invitations', user?._id, userType],
    queryFn: () => {
      if (userType === 'brand') {
        return invitationApi.getBrandInvitations();
      } else if (userType === 'manufacturer') {
        return invitationApi.getManufacturerInvitations();
      }
      throw new Error('User type not determined');
    },
    enabled: !!user && !!userType,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Query for single invitation by ID
  const getInvitationQuery = (id: string) => useQuery<InvitationDetailsResponse, ApiError>({
    queryKey: ['invitation', id],
    queryFn: () => invitationApi.getInvitationById(id),
    enabled: !!id,
  });

  // Query for invitation statistics
  const getInvitationStatsQuery = (params?: { timeframe?: number; breakdown?: string }) => useQuery<InvitationStatsResponse, ApiError>({
    queryKey: ['invitationStats', user?._id, params],
    queryFn: () => invitationApi.getInvitationStats(params),
    enabled: !!user,
  });

  // Query for connections
  const getConnectionsQuery = () => useQuery<ConnectionsResponse, ApiError>({
    queryKey: ['connections', user?._id],
    queryFn: invitationApi.getConnections,
    enabled: !!user,
  });

  // Mutation for sending invitation (brand only)
  const sendMutation = useMutation<{ success: boolean; data: { invitation: any } }, ApiError, SendInvitationRequest>({
    mutationFn: invitationApi.sendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitationOverview'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['invitationStats'] });
    },
  });

  // Mutation for responding to invitation (manufacturer only)
  const respondMutation = useMutation<{ success: boolean; data: { invitation: any; action: string } }, ApiError, { id: string; data: RespondToInvitationRequest }>({
    mutationFn: ({ id, data }) => invitationApi.respondToInvitation(id, data),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(['invitation', variables.id], response.data.invitation);
      queryClient.invalidateQueries({ queryKey: ['invitationOverview'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  // Mutation for deleting invitation
  const deleteMutation = useMutation<{ success: boolean }, ApiError, string>({
    mutationFn: invitationApi.deleteInvitation,
    onSuccess: (_, invitationId) => {
      queryClient.invalidateQueries({ queryKey: ['invitationOverview'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.removeQueries({ queryKey: ['invitation', invitationId] });
    },
  });

  return {
    // Data from queries
    overview: invitationOverview?.data?.overview,
    features: invitationOverview?.data?.features,
    limits: invitationOverview?.data?.limits,
    invitations: invitationList?.data?.invitations,
    stats: invitationList?.data?.stats,
    userType,
    canSendInvitations,
    canRespondToInvitations,
    
    // Loading states
    isLoadingOverview,
    isLoadingInvitations,
    overviewError,
    invitationsError,
    
    // Query functions
    getInvitationById: getInvitationQuery,
    getInvitationStats: getInvitationStatsQuery,
    getConnections: getConnectionsQuery,
    
    // Mutation functions
    sendInvitation: sendMutation.mutate,
    respondToInvitation: respondMutation.mutate,
    deleteInvitation: deleteMutation.mutate,
    
    // Mutation states
    isSending: sendMutation.isPending,
    isResponding: respondMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};