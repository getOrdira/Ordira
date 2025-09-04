// src/lib/api/user.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

export interface User {
  _id: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  name?: string;
  role?: 'brand' | 'manufacturer' | 'customer' | 'admin';
  lastLoginAt?: Date;
  analytics: {
    totalVotes: number;
    totalSessions: number;
    engagementScore: number;
    lastActiveAt?: Date;
  };
}

export interface UserProfile {
  name?: string;
  email: string;
  avatar?: string;
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    language: string;
    timezone: string;
  };
  votingPreferences?: {
    categories: string[];
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[];
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showVotingHistory: boolean;
    showEngagement: boolean;
  };
  voting: {
    preferredCategories: string[];
    reminderFrequency: 'never' | 'daily' | 'weekly';
    showResults: boolean;
  };
}

export interface VotingHistory {
  votes: Array<{
    proposalId: string;
    vote: any;
    votedAt: Date;
    businessId: string;
    proposal?: any;
  }>;
  total: number;
  totalPages: number;
  page: number;
}

// Response interfaces matching backend structure
export interface UserProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    insights: any;
    activity: {
      votingHistory: VotingHistory;
      sessionStats: any;
    };
    recommendations: string[];
    retrievedAt: string;
  };
}

export interface UserListResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    stats: any;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: any;
    retrievedAt: string;
  };
}

export interface VoteSubmissionResponse {
  success: boolean;
  message: string;
  data: {
    vote: {
      proposalId: string;
      vote: any;
      submittedAt: string;
    };
    user: {
      totalVotes: number;
      engagementScore: number;
    };
    impact: any;
    voteRecorded: boolean;
  };
}

export interface VoteStatusResponse {
  success: boolean;
  message: string;
  data: {
    proposalId: string;
    voteStatus: {
      hasVoted: boolean;
      vote?: any;
      votedAt?: string;
    };
    eligibility: {
      canVote: boolean;
      reasons: string[];
    };
    checkedAt: string;
  };
}

/**
 * Gets current user profile with comprehensive data.
 * @returns Promise<UserProfileResponse>
 */
export const getUserProfile = async (): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.get<UserProfileResponse>('/api/users/profile');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch user profile', error);
  }
};

/**
 * Updates user profile.
 * @param data - Profile update data
 * @returns Promise<UserProfileResponse>
 */
export const updateUserProfile = async (data: Partial<UserProfile>): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.put<UserProfileResponse>('/api/users/profile', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update user profile', error);
  }
};

/**
 * Deletes user account.
 * @returns Promise<{ success: boolean }>
 */
export const deleteUserAccount = async (): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: any}>('/api/users/profile');
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to delete user account', error);
  }
};

/**
 * Uploads user avatar.
 * @param file - Avatar file
 * @returns Promise<{ success: boolean; avatarUrl: string }>
 */
export const uploadAvatar = async (file: File): Promise<{ success: boolean; avatarUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post<{success: boolean; data: {avatarUrl: string}}>('/api/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      success: response.data.success,
      avatarUrl: response.data.data.avatarUrl,
    };
  } catch (error) {
    throw new ApiError('Failed to upload avatar', error);
  }
};

/**
 * Removes user avatar.
 * @returns Promise<{ success: boolean }>
 */
export const removeAvatar = async (): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: any}>('/api/users/profile/avatar');
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to remove avatar', error);
  }
};

/**
 * Gets user's voting history.
 * @param params - Query parameters
 * @returns Promise<VotingHistory>
 */
export const getVotingHistory = async (params?: {
  businessId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    history: VotingHistory;
    stats: any;
    insights: any;
    pagination: any;
    retrievedAt: string;
  };
}> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        history: VotingHistory;
        stats: any;
        insights: any;
        pagination: any;
        retrievedAt: string;
      };
    }>('/api/users/voting-history', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch voting history', error);
  }
};

/**
 * Gets user activity log.
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getUserActivity = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/users/profile/activity', {
      params,
    });
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch user activity', error);
  }
};

/**
 * Gets user statistics.
 * @returns Promise<any>
 */
export const getUserStats = async (): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/users/profile/stats');
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch user stats', error);
  }
};

// ===== VOTING FUNCTIONALITY =====

/**
 * Submits a vote for a proposal.
 * @param data - Vote submission data
 * @returns Promise<VoteSubmissionResponse>
 */
export const submitVote = async (data: {
  proposalId: string;
  selectedProducts?: string[]; // For proposal selections
  vote?: any; // For other vote types
  reason?: string;
}): Promise<VoteSubmissionResponse> => {
  try {
    const response = await apiClient.post<VoteSubmissionResponse>('/api/users/vote', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to submit vote', error);
  }
};

/**
 * Checks user's vote status for a proposal.
 * @param proposalId - Proposal ID
 * @returns Promise<VoteStatusResponse>
 */
export const checkVoteStatus = async (proposalId: string): Promise<VoteStatusResponse> => {
  try {
    const response = await apiClient.get<VoteStatusResponse>(`/api/users/vote/status/${proposalId}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to check vote status', error);
  }
};

/**
 * Records user interaction with brands/products.
 * @param data - Interaction data
 * @returns Promise<{ success: boolean }>
 */
export const recordInteraction = async (data: {
  type: string;
  targetId: string;
  targetType: 'product' | 'brand' | 'proposal';
  metadata?: any;
}): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/users/interaction', data);
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to record interaction', error);
  }
};

// ===== USER SETTINGS =====

/**
 * Gets all user settings.
 * @returns Promise<UserSettings>
 */
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {settings: UserSettings}}>('/api/users/settings');
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to fetch user settings', error);
  }
};

/**
 * Updates all user settings.
 * @param settings - Updated settings
 * @returns Promise<UserSettings>
 */
export const updateUserSettings = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {settings: UserSettings}}>('/api/users/settings', settings);
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to update user settings', error);
  }
};

/**
 * Gets notification settings.
 * @returns Promise<UserSettings['notifications']>
 */
export const getNotificationSettings = async (): Promise<UserSettings['notifications']> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {settings: UserSettings['notifications']}}>('/api/users/settings/notifications');
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to fetch notification settings', error);
  }
};

/**
 * Updates notification settings.
 * @param settings - Updated notification settings
 * @returns Promise<UserSettings['notifications']>
 */
export const updateNotificationSettings = async (settings: Partial<UserSettings['notifications']>): Promise<UserSettings['notifications']> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {settings: UserSettings['notifications']}}>('/api/users/settings/notifications', settings);
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to update notification settings', error);
  }
};

/**
 * Gets privacy settings.
 * @returns Promise<UserSettings['privacy']>
 */
export const getPrivacySettings = async (): Promise<UserSettings['privacy']> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {settings: UserSettings['privacy']}}>('/api/users/settings/privacy');
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to fetch privacy settings', error);
  }
};

/**
 * Updates privacy settings.
 * @param settings - Updated privacy settings
 * @returns Promise<UserSettings['privacy']>
 */
export const updatePrivacySettings = async (settings: Partial<UserSettings['privacy']>): Promise<UserSettings['privacy']> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {settings: UserSettings['privacy']}}>('/api/users/settings/privacy', settings);
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to update privacy settings', error);
  }
};

/**
 * Gets voting preferences.
 * @returns Promise<UserSettings['voting']>
 */
export const getVotingPreferences = async (): Promise<UserSettings['voting']> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {settings: UserSettings['voting']}}>('/api/users/settings/voting-preferences');
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to fetch voting preferences', error);
  }
};

/**
 * Updates voting preferences.
 * @param preferences - Updated voting preferences
 * @returns Promise<UserSettings['voting']>
 */
export const updateVotingPreferences = async (preferences: Partial<UserSettings['voting']>): Promise<UserSettings['voting']> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {settings: UserSettings['voting']}}>('/api/users/settings/voting-preferences', preferences);
    return response.data.data.settings;
  } catch (error) {
    throw new ApiError('Failed to update voting preferences', error);
  }
};

// ===== ADMIN/MANAGEMENT FUNCTIONS =====

/**
 * Lists users with filtering and pagination (Admin/Brand access).
 * @param params - Query parameters for filtering
 * @returns Promise<UserListResponse>
 */
export const getUsers = async (params?: {
  status?: 'active' | 'inactive' | 'suspended';
  isEmailVerified?: boolean;
  hasVoted?: boolean;
  businessId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<UserListResponse> => {
  try {
    const response = await apiClient.get<UserListResponse>('/api/users', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch users', error);
  }
};

/**
 * Gets a specific user by ID.
 * @param id - User ID
 * @returns Promise<UserProfileResponse>
 */
export const getUser = async (id: string): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.get<UserProfileResponse>(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch user', error);
  }
};

/**
 * Updates a specific user (Admin access).
 * @param id - User ID
 * @param data - Update data
 * @returns Promise<UserProfileResponse>
 */
export const updateUser = async (id: string, data: Partial<User>): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.patch<UserProfileResponse>(`/api/users/${id}`, data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update user', error);
  }
};

/**
 * Deletes a user (Admin access).
 * @param id - User ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteUser = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: any}>(`/api/users/${id}`);
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to delete user', error);
  }
};

// Legacy function aliases for backward compatibility
export const getCurrentUser = getUserProfile;