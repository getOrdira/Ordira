// src/lib/api/brandAccount.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

export interface BrandAccount {
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  passwordResetAttempts?: number;
  lastPasswordResetAttempt?: Date;
  lastPasswordChangeAt?: Date;
  isAccountLocked: boolean;
  profilePictureUrl?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationDocuments?: string[];
  deactivatedAt?: Date;
  deactivationReason?: string;
}

export interface BrandProfileResponse {
  success: boolean;
  data: {
    profile: BrandAccount & {
      profileCompleteness: number;
      lastUpdated: Date;
      accountAge: number;
    };
    metadata: any;
    planInfo: {
      currentPlan: string;
      features: string[];
      limitations: string[];
    };
    recommendations: string[];
  };
}

export interface VerificationStatus {
  currentStatus: {
    status: 'unverified' | 'pending' | 'verified' | 'rejected';
    submittedAt?: Date;
    reviewedAt?: Date;
    notes?: string;
  };
  history: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
  }>;
  benefits: string[];
  requirements: string[];
}

export interface ActivityLog {
  activities: Array<{
    type: string;
    timestamp: Date;
    details: any;
    ipAddress?: string;
    userAgent?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

/**
 * Gets comprehensive brand profile/account details.
 * @returns Promise<BrandProfileResponse>
 */
export const getBrandProfile = async (): Promise<BrandProfileResponse> => {
  try {
    const response = await apiClient.get<BrandProfileResponse>('/api/brand/account/profile');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch brand profile', error);
  }
};

/**
 * Updates brand profile with comprehensive validation.
 * @param data - Profile update data
 * @returns Promise<BrandProfileResponse>
 */
export const updateBrandProfile = async (data: {
  profilePictureUrl?: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  website?: string;
  phoneNumber?: string;
  socialUrls?: string[];
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  yearEstablished?: number;
  walletAddress?: string;
}): Promise<BrandProfileResponse> => {
  try {
    const response = await apiClient.put<BrandProfileResponse>('/api/brand/account/profile', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update brand profile', error);
  }
};

/**
 * Uploads brand profile picture.
 * @param file - Profile picture file
 * @returns Promise<{ success: boolean; profilePictureUrl: string }>
 */
export const uploadProfilePicture = async (file: File): Promise<{ success: boolean; profilePictureUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiClient.post<{success: boolean; data: {profilePictureUrl: string}}>('/api/brand/account/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return {
      success: response.data.success,
      profilePictureUrl: response.data.data.profilePictureUrl,
    };
  } catch (error) {
    throw new ApiError('Failed to upload profile picture', error);
  }
};

/**
 * Removes brand profile picture.
 * @returns Promise<{ success: boolean }>
 */
export const removeProfilePicture = async (): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean}>('/api/brand/account/profile-picture');
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to remove profile picture', error);
  }
};

/**
 * Gets verification status and requirements.
 * @returns Promise<VerificationStatus>
 */
export const getVerificationStatus = async (): Promise<VerificationStatus> => {
  try {
    const response = await apiClient.get<VerificationStatus>('/api/brand/account/verification');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch verification status', error);
  }
};

/**
 * Submits brand verification documents.
 * @param data - Verification submission data
 * @param files - Verification documents
 * @returns Promise<any>
 */
export const submitVerification = async (
  data: {
    businessName?: string;
    businessType?: string;
    businessRegistrationNumber?: string;
    taxIdNumber?: string;
    businessAddress?: any;
    authorizedRepresentative?: any;
    verificationNotes?: string;
  },
  files?: File[]
): Promise<any> => {
  try {
    const formData = new FormData();
    
    // Add verification data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    
    // Add files
    if (files) {
      files.forEach((file, index) => {
        formData.append(`documents[${index}]`, file);
      });
    }

    const response = await apiClient.post<{success: boolean; data: any}>('/api/brand/account/verification', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to submit verification', error);
  }
};

/**
 * Gets account activity log.
 * @param params - Query parameters
 * @returns Promise<ActivityLog>
 */
export const getActivityLog = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActivityLog> => {
  try {
    const response = await apiClient.get<{success: boolean; data: ActivityLog}>('/api/brand/account/activity', {
      params,
    });
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch activity log', error);
  }
};

/**
 * Changes account password.
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns Promise<{ success: boolean; message?: string }>
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{success: boolean; message?: string}>('/api/brand/account/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to change password', error);
  }
};

/**
 * Requests password reset.
 * @param email - Email for reset (optional if current user)
 * @returns Promise<{ success: boolean; message: string }>
 */
export const requestPasswordReset = async (email?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post<{success: boolean; message: string}>('/api/brand/account/request-reset', { email });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to request password reset', error);
  }
};

/**
 * Completes password reset with token.
 * @param token - Reset token
 * @param newPassword - New password
 * @returns Promise<{ success: boolean; message?: string }>
 */
export const completePasswordReset = async (token: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{success: boolean; message?: string}>('/api/brand/account/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to complete password reset', error);
  }
};

/**
 * Deactivates brand account.
 * @param data - Deactivation data
 * @returns Promise<any>
 */
export const deactivateAccount = async (data: {
  reason: string;
  feedback?: string;
  deleteData?: boolean;
  confirmPassword: string;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/brand/account/deactivate', data);
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to deactivate account', error);
  }
};

/**
 * Reactivates brand account.
 * @param data - Reactivation data
 * @returns Promise<{ success: boolean }>
 */
export const reactivateAccount = async (data: {
  confirmPassword: string;
  reason?: string;
}): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{success: boolean}>('/api/brand/account/reactivate', data);
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to reactivate account', error);
  }
};

/**
 * Gets account security settings.
 * @returns Promise<any>
 */
export const getSecuritySettings = async (): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/brand/account/security');
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch security settings', error);
  }
};

/**
 * Updates account security settings.
 * @param settings - Security settings
 * @returns Promise<any>
 */
export const updateSecuritySettings = async (settings: {
  twoFactorAuth?: boolean;
  sessionTimeout?: number;
  loginNotifications?: boolean;
  allowedIPs?: string[];
}): Promise<any> => {
  try {
    const response = await apiClient.put<{success: boolean; data: any}>('/api/brand/account/security', settings);
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to update security settings', error);
  }
};

// Legacy function aliases for backward compatibility
export const getBrandAccount = getBrandProfile;
export const updateBrandAccount = updateBrandProfile;
export const resetLoginAttempts = () => Promise.resolve({ success: true }); // Handled automatically by backend