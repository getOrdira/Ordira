/**
 * Brand Types
 * 
 * Re-exports backend brand types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  BrandProfile,
  BrandProfileSummary,
  BrandAnalytics
} from '@backend/services/brands/core/brandProfile.service';

import type {
  EnhancedBrandSettings
} from '@backend/services/brands/core/brandSettings.service';

import type {
  ProfilePictureUploadResult
} from '@backend/services/brands/core/brandAccount.service';

// Re-export all backend types
export type {
  BrandProfile,
  BrandProfileSummary,
  BrandAnalytics,
  EnhancedBrandSettings,
  ProfilePictureUploadResult
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Brand profile display type with enhanced UI fields
 */
export interface BrandProfileDisplay extends BrandProfileSummary {
  _ui?: {
    formattedThemeColor?: string;
    logoUrl?: string;
    bannerImages?: string[];
    isVerified?: boolean;
    verificationBadge?: 'verified' | 'pending' | 'unverified';
    profileCompleteness?: number;
    profileCompletenessPercentage?: number;
  };
}

/**
 * Brand settings form data
 */
export interface BrandSettingsFormData {
  businessName?: string;
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  subdomain?: string;
  customDomain?: string;
  web3Settings?: {
    brandWallet?: string;
    autoTransferEnabled?: boolean;
    transferDelay?: number;
  };
  _ui?: {
    isDraft?: boolean;
    validationErrors?: Record<string, string>;
    logoFile?: File;
    bannerFiles?: File[];
  };
}

