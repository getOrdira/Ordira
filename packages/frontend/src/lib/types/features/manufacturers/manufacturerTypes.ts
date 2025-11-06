/**
 * Manufacturer Types
 * 
 * Re-exports backend manufacturer types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  ManufacturerProfile,
  ManufacturerSearchResult
} from '@backend/services/manufacturers/core/manufacturerProfile.service';

// Re-export all backend types
export type {
  ManufacturerProfile,
  ManufacturerSearchResult
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Manufacturer profile display type with enhanced UI fields
 */
export interface ManufacturerProfileDisplay extends ManufacturerProfile {
  _ui?: {
    formattedProfileCompleteness?: string;
    profileCompletenessPercentage?: number;
    verificationBadge?: 'verified' | 'pending' | 'unverified';
    profileScoreBadge?: 'excellent' | 'good' | 'fair' | 'poor';
    formattedResponseTime?: string;
    formattedEstablishedYear?: string;
    formattedEmployeeCount?: string;
  };
}

/**
 * Manufacturer profile form data
 */
export interface ManufacturerProfileFormData {
  name: string;
  industry?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  contactEmail?: string;
  socialUrls?: string[];
  website?: string;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
  certifications?: string[];
  manufacturingCapabilities?: {
    productTypes?: string[];
    materials?: string[];
    processes?: string[];
    qualityStandards?: string[];
    customization?: string;
  };
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    profilePictureFile?: File;
  };
}

