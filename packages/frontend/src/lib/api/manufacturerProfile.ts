// src/lib/api/manufacturerProfile.ts

import apiClient from './client';
import { ApiError } from '@/lib/errors'; 


export interface ManufacturerProfile {
  // Core manufacturer fields from manufacturer.model.ts
  name: string;
  email: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  website?: string;
  socialUrls?: string[];
  
  // Business information
  businessLicense?: string;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
    postalCode?: string;
  };
  
  // Manufacturing capabilities
  manufacturingCapabilities?: {
    productTypes?: string[];
    materials?: string[];
    processes?: string[];
    qualityStandards?: string[];
    customization?: 'none' | 'limited' | 'full';
    sustainabilityPractices?: string[];
  };
  
  // Certifications
  certifications?: Array<{
    name: string;
    issuer: string;
    dateIssued?: Date;
    expiryDate?: Date;
    certificateUrl?: string;
  }>;
  
  // Account status and verification
  isActive?: boolean;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  
  // Business metrics
  totalConnections?: number;
  averageResponseTime?: number;
  successfulProjects?: number;
  clientSatisfactionRating?: number;
  profileScore?: number;
  
  // Communication preferences
  preferredContactMethod?: 'email' | 'phone' | 'message';
  timezone?: string;
  responseTimeCommitment?: number;
  
  // Metadata
  profileCompleteness?: number;
  accountAge?: number;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

export interface ManufacturerProfileResponse {
  profile: ManufacturerProfile;
  stats?: {
    profileCompleteness: number;
    accountAge: number;
    lastUpdated: Date;
  };
  recommendations?: string[];
}

/**
 * Fetches the manufacturer profile.
 * Endpoint: GET /api/manufacturer/profile (from manufacturer.routes.ts)
 * Response: ManufacturerProfileResponse with comprehensive profile data
 * Controller: manufacturer.controller.getProfile (requires manufacturer auth)
 * @returns Promise<ManufacturerProfileResponse>
 */
export const getManufacturerProfile = async (): Promise<ManufacturerProfileResponse> => {
  try {
    const response = await apiClient.get<ManufacturerProfileResponse>('/api/manufacturer/profile');
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer profile', 500);
  }
};

/**
 * Updates the manufacturer profile.
 * Endpoint: PUT /api/manufacturer/profile (from manufacturer.routes.ts)
 * Request body: Partial<ManufacturerProfile> (validated by updateManufacturerProfileSchema)
 * Response: Updated ManufacturerProfileResponse
 * Controller: manufacturer.controller.updateProfile with comprehensive validation
 * @param data - Profile update data
 * @returns Promise<ManufacturerProfileResponse>
 */
export const updateManufacturerProfile = async (data: Partial<ManufacturerProfile>): Promise<ManufacturerProfileResponse> => {
  try {
    const response = await apiClient.put<ManufacturerProfileResponse>('/api/manufacturer/profile', data);
    return response;
  } catch (error) {
    throw new ApiError('Failed to update manufacturer profile', 500);
  }
};