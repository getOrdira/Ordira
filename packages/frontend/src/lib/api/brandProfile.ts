// src/lib/api/brandProfile.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types



export interface BrandProfile {
  // Core business fields from business.model.ts
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  address: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  profilePictureUrl?: string;
  website?: string;
  phoneNumber?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  yearEstablished?: number;
  
  // Additional business fields
  regNumber?: string;
  taxId?: string;
  walletAddress?: string;
  certificateWallet?: string;
  
  // Metadata from controller
  profileCompleteness?: number;
  lastUpdated?: Date;
  accountAge?: number;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BrandProfileResponse {
  profile: BrandProfile;
  metadata?: {
    planInfo?: {
      currentPlan: string;
      features: string[];
      limitations: string[];
    };
  };
  recommendations?: string[];
}

/**
 * Fetches the brand profile.
 * Endpoint: GET /api/brand/account/profile (from brandAccount.routes.ts)
 * Response: BrandProfileResponse with comprehensive profile data
 * Controller: brandAccount.controller.getBrandProfile
 * @returns Promise<BrandProfileResponse>
 */
export const getBrandProfile = async (): Promise<BrandProfileResponse> => {
  try {
    const response = await apiClient.get<BrandProfileResponse>('/api/brand/account/profile');
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch brand profile', 500);
  }
};

/**
 * Updates the brand profile.
 * Endpoint: PUT /api/brand/account/profile (from brandAccount.routes.ts)
 * Request body: Partial<BrandProfile> (validated by brandAccountValidationSchemas)
 * Response: Updated BrandProfileResponse
 * Controller: brandAccount.controller.updateBrandProfile with comprehensive validation
 * @param data - Profile update data
 * @returns Promise<BrandProfileResponse>
 */
export const updateBrandProfile = async (data: Partial<BrandProfile>): Promise<BrandProfileResponse> => {
  try {
    const response = await apiClient.put<BrandProfileResponse>('/api/brand/account/profile', data);
    return response;
  } catch (error) {
    throw new ApiError('Failed to update brand profile', 500);
  }
};