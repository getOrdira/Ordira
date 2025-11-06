// src/lib/api/features/brands/brandAccount.api.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BrandAccountOverview,
  BrandAccountDeactivationRequest,
  BrandAccountDeactivationResult,
  BrandAccountReactivationResult,
  BrandProfileCompleteness,
  BrandVerificationSubmissionResult,
  BrandProfile,
  ProfilePictureUploadResult,
  VerificationStatus
} from '@/lib/types/features/brands';

const BASE_PATH = '/brand/account';

const toCleanObject = <T extends Record<string, unknown>>(input?: T | null): Record<string, unknown> | undefined => {
  if (!input) {
    return undefined;
  }
  return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const toFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};

export interface BrandAccountProfileParams {
  includeAnalytics?: boolean;
  includeMetadata?: boolean;
}

export interface BrandAccountUpdateInput {
  profilePictureUrl?: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  walletAddress?: string;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
    timezone?: string;
  };
  businessInformation?: {
    establishedYear?: number;
    employeeCount?: string;
    annualRevenue?: string;
    businessLicense?: string;
    certifications?: string[];
  };
  communicationPreferences?: {
    preferredMethod?: string;
    responseTime?: string;
    languages?: string[];
  };
  marketingPreferences?: {
    allowEmails?: boolean;
    allowSms?: boolean;
    allowPushNotifications?: boolean;
  };
}

export interface BrandVerificationPayload {
  businessLicense?: string;
  taxId?: string;
  businessRegistration?: string;
  bankStatement?: string;
  identityDocument?: string;
  additionalDocuments?: string[];
}

/**
 * Brand Account API
 *
 * Handles all brand account-related API calls.
 * Routes: /api/brand/account/*
 */
export const brandAccountApi = {
  /**
   * Fetch comprehensive brand account profile.
   * GET /api/brand/account
   */
  async getProfile(
    params?: BrandAccountProfileParams,
  ): Promise<BrandAccountOverview> {
    try {
      const response = await api.get<ApiResponse<{ profile: BrandAccountOverview }>>(
        BASE_PATH,
        { params: toCleanObject(params) },
      );
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch brand account profile',
        500,
      );
      return profile;
    } catch (error) {
      console.error('Brand account profile fetch error:', error);
      throw error;
    }
  },

  /**
   * Update brand account information.
   * PUT /api/brand/account
   */
  async updateProfile(
    payload: BrandAccountUpdateInput,
  ): Promise<BrandProfile & Record<string, unknown>> {
    try {
      const sanitized = baseApi.sanitizeRequestData(payload);
      const response = await api.put<ApiResponse<{ profile: BrandProfile & Record<string, unknown> }>>(
        BASE_PATH,
        sanitized,
      );
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to update brand account profile',
        400,
      );
      return profile;
    } catch (error) {
      console.error('Brand account profile update error:', error);
      throw error;
    }
  },

  /**
   * Upload a new brand profile picture.
   * POST /api/brand/account/picture
   */
  async uploadProfilePicture(file: File): Promise<ProfilePictureUploadResult> {
    try {
      const formData = toFormData(file);
      const response = await api.postFormData<ApiResponse<{ uploadResult: ProfilePictureUploadResult }>>(
        `${BASE_PATH}/picture`,
        formData,
      );
      const { uploadResult } = baseApi.handleResponse(
        response,
        'Failed to upload profile picture',
        400,
      );
      return uploadResult;
    } catch (error) {
      console.error('Brand profile picture upload error:', error);
      throw error;
    }
  },

  /**
   * Remove the current brand profile picture.
   * DELETE /api/brand/account/picture
   */
  async removeProfilePicture(): Promise<string> {
    try {
      const response = await api.delete<ApiResponse<{ message?: string }>>(
        `${BASE_PATH}/picture`,
      );
      const { message } = baseApi.handleResponse(
        response,
        'Failed to remove profile picture',
        400,
      );
      return message ?? 'Profile picture removed';
    } catch (error) {
      console.error('Brand profile picture removal error:', error);
      throw error;
    }
  },

  /**
   * Submit verification documents for the brand.
   * POST /api/brand/account/verification
   */
  async submitVerification(
    payload: BrandVerificationPayload,
  ): Promise<BrandVerificationSubmissionResult> {
    try {
      const response = await api.post<ApiResponse<{ verificationResult: BrandVerificationSubmissionResult }>>(
        `${BASE_PATH}/verification`,
        baseApi.sanitizeRequestData(payload),
      );
      const { verificationResult } = baseApi.handleResponse(
        response,
        'Failed to submit verification documents',
        400,
      );
      return verificationResult;
    } catch (error) {
      console.error('Brand verification submission error:', error);
      throw error;
    }
  },

  /**
   * Retrieve current verification status.
   * GET /api/brand/account/verification
   */
  async getVerificationStatus(): Promise<VerificationStatus> {
    try {
      const response = await api.get<ApiResponse<{ status: VerificationStatus }>>(
        `${BASE_PATH}/verification`,
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch verification status',
        500,
      );
      return status;
    } catch (error) {
      console.error('Brand verification status fetch error:', error);
      throw error;
    }
  },

  /**
   * Retrieve brand profile completeness score.
   * GET /api/brand/account/completeness
   */
  async getProfileCompleteness(): Promise<BrandProfileCompleteness> {
    try {
      const response = await api.get<ApiResponse<{ completeness: BrandProfileCompleteness }>>(
        `${BASE_PATH}/completeness`,
      );
      const { completeness } = baseApi.handleResponse(
        response,
        'Failed to fetch profile completeness',
        500,
      );
      return completeness;
    } catch (error) {
      console.error('Brand profile completeness fetch error:', error);
      throw error;
    }
  },

  /**
   * Retrieve profile improvement recommendations.
   * GET /api/brand/account/recommendations
   */
  async getProfileRecommendations(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<{ recommendations: string[] }>>(
        `${BASE_PATH}/recommendations`,
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch profile recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      console.error('Brand profile recommendation fetch error:', error);
      throw error;
    }
  },

  /**
   * Deactivate the brand account.
   * POST /api/brand/account/deactivate
   */
  async deactivateAccount(
    payload: BrandAccountDeactivationRequest,
  ): Promise<BrandAccountDeactivationResult> {
    try {
      const response = await api.post<ApiResponse<{ deactivationData: BrandAccountDeactivationResult }>>(
        `${BASE_PATH}/deactivate`,
        baseApi.sanitizeRequestData(payload),
      );
      const { deactivationData } = baseApi.handleResponse(
        response,
        'Failed to deactivate brand account',
        400,
      );
      return deactivationData;
    } catch (error) {
      console.error('Brand account deactivation error:', error);
      throw error;
    }
  },

  /**
   * Reactivate a previously deactivated brand account.
   * POST /api/brand/account/reactivate
   */
  async reactivateAccount(): Promise<BrandAccountReactivationResult> {
    try {
      const response = await api.post<ApiResponse<{ reactivationData: BrandAccountReactivationResult }>>(
        `${BASE_PATH}/reactivate`,
      );
      const { reactivationData } = baseApi.handleResponse(
        response,
        'Failed to reactivate brand account',
        400,
      );
      return reactivationData;
    } catch (error) {
      console.error('Brand account reactivation error:', error);
      throw error;
    }
  },
};

export default brandAccountApi;


