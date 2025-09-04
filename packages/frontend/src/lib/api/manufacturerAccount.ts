// src/lib/api/manufacturerAccount.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

export interface ManufacturerAccount {
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
}

export interface ManufacturerProfileResponse {
  success: boolean;
  message: string;
  data: {
    profile: ManufacturerAccount & {
      profileCompleteness: number;
      lastUpdated: Date;
      accountAge: number;
    };
    metadata: any;
    recommendations: string[];
  };
}

export interface VerificationStatus {
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
  requirements: string[];
  submittedDocuments: string[];
  reviewNotes?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
}

export interface ActivityLog {
  activities: Array<{
    type: 'login' | 'profile_update' | 'verification_submitted' | 'document_uploaded' | 'password_change' | 'security_event';
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
 * Gets manufacturer profile/account details.
 * @returns Promise<ManufacturerProfileResponse>
 */
export const getManufacturerProfile = async (): Promise<ManufacturerProfileResponse> => {
  try {
    const response = await apiClient.get<ManufacturerProfileResponse>('/api/manufacturer-account');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer profile', error);
  }
};

/**
 * Updates complete manufacturer profile/account.
 * @param data - Profile update data
 * @returns Promise<ManufacturerProfileResponse>
 */
export const updateManufacturerProfile = async (data: Partial<ManufacturerAccount>): Promise<ManufacturerProfileResponse> => {
  try {
    const response = await apiClient.put<ManufacturerProfileResponse>('/api/manufacturer-account', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update manufacturer profile', error);
  }
};

/**
 * Deletes manufacturer account (soft delete).
 * @param confirmPassword - Password confirmation for security
 * @returns Promise<{ success: boolean }>
 */
export const deleteManufacturerAccount = async (confirmPassword: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean}>('/api/manufacturer-account', {
      data: { confirmPassword },
    });
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to delete manufacturer account', error);
  }
};

/**
 * Uploads manufacturer profile picture.
 * @param file - Profile picture file
 * @returns Promise<{ success: boolean; profilePictureUrl: string }>
 */
export const uploadProfilePicture = async (file: File): Promise<{ success: boolean; profilePictureUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiClient.post<{success: boolean; data: {profilePictureUrl: string; uploadedAt: string; fileSize: number; fileType: string}}>('/api/manufacturer-account/profile-picture', formData, {
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
 * Gets verification status and requirements.
 * @returns Promise<VerificationStatus>
 */
export const getVerificationStatus = async (): Promise<VerificationStatus> => {
  try {
    const response = await apiClient.get<{success: boolean; data: VerificationStatus}>('/api/manufacturer-account/verification');
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch verification status', error);
  }
};

/**
 * Submits verification documents.
 * @param files - Verification documents
 * @param notes - Optional verification notes
 * @returns Promise<any>
 */
export const submitVerificationDocuments = async (files: File[], notes?: string): Promise<any> => {
  try {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`documents[${index}]`, file);
    });
    
    if (notes) {
      formData.append('notes', notes);
    }

    const response = await apiClient.post<{success: boolean; data: any}>('/api/manufacturer-account/verification/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to submit verification documents', error);
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
  type?: 'login' | 'profile_update' | 'verification_submitted' | 'document_uploaded' | 'password_change' | 'security_event';
  startDate?: string;
  endDate?: string;
}): Promise<ActivityLog> => {
  try {
    const response = await apiClient.get<{success: boolean; data: ActivityLog}>('/api/manufacturer-account/activity', {
      params,
    });
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch activity log', error);
  }
};

/**
 * Changes password.
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns Promise<{ success: boolean }>
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.patch<{success: boolean}>('/api/manufacturer-account/password', {
      currentPassword,
      newPassword,
    });
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to change password', error);
  }
};

/**
 * Requests password reset.
 * @param email - Optional email
 * @returns Promise<{ success: boolean; message: string }>
 */
export const requestPasswordReset = async (email?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post<{success: boolean; message: string}>('/api/manufacturer-account/reset-password', { email });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to request password reset', error);
  }
};

/**
 * Completes password reset.
 * @param code - Reset code
 * @param newPassword - New password
 * @returns Promise<{ success: boolean }>
 */
export const completePasswordReset = async (code: string, newPassword: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.patch<{success: boolean}>('/api/manufacturer-account/complete-reset', {
      code,
      newPassword,
    });
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to complete password reset', error);
  }
};

/**
 * Resets login attempts.
 * @returns Promise<{ success: boolean }>
 */
export const resetLoginAttempts = async (): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{success: boolean}>('/api/manufacturer-account/reset-attempts');
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to reset login attempts', error);
  }
};