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
  ManufacturerSearchResult,
  SearchOptions as ManufacturerProfileSearchOptions,
  SearchResult as ManufacturerProfileSearchResult,
  ProfileContext
} from '@backend/services/manufacturers/core/manufacturerProfile.service';
import type { IManufacturer } from '@backend/models/manufacturer/manufacturer.model';
import type {
  ManufacturerSearchParams,
  RegisterManufacturerData,
  UpdateManufacturerData
} from '@backend/services/manufacturers/core/manufacturerData.service';
import type {
  AccountActivity,
  NotificationPreferences,
  DataExportResult,
  ProfilePictureUploadResult,
  SoftDeleteResult,
  ActivityFilters
} from '@backend/services/manufacturers/core/manufacturerAccount.service';
import type {
  AdvancedSearchFilters,
  SearchOptions as ManufacturerAdvancedSearchOptions,
  SearchHighlight,
  AdvancedSearchResult,
  SearchSuggestion,
  ComparisonCriteria as ManufacturerSearchComparisonCriteria,
  ManufacturerComparison,
  TrendAnalysis,
  IndustryBenchmark
} from '@backend/services/manufacturers/features/search.service';
import type {
  ManufacturerComparisonResult,
  ComparisonCriteria as ManufacturerComparisonCriteria
} from '@backend/services/manufacturers/utils/comparisonEngine.service';
import type {
  VerificationStatus,
  VerificationRequirement,
  VerificationDocument,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  DetailedVerificationStatus
} from '@backend/services/manufacturers/features/verification.service';
import type {
  FileUploadOptions,
  UploadedFile,
  QRCodeOptions,
  QRCodeResult,
  MediaGallery,
  BrandAssets,
  MediaAnalytics,
  ImageProcessingOptions
} from '@backend/services/manufacturers/features/media.service';
import type {
  SupplyChainContractInfo,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainEvent,
  SupplyChainDashboard,
  ProductQrCodeInfo,
  QrCodeGenerationResult,
  BatchQrCodeResult
} from '@backend/services/manufacturers/features/supplyChain.service';
import type {
  ManufacturerAnalytics,
  ManufacturerStatistics,
  PerformanceMetrics,
  ExportOptions as ManufacturerAnalyticsExportOptions,
  ExportResult as ManufacturerAnalyticsExportResult
} from '@backend/services/manufacturers/features/analytics.service';
import type {
  PlanValidationResult,
  ManufacturerPlanLimits,
  ManufacturerPlanFeatures
} from '@backend/services/manufacturers/validation/planValidation.service';
import type {
  ValidationResult as ManufacturerValidationResult
} from '@backend/services/manufacturers/validation/manufacturerValidation.service';
import type {
  FileValidationOptions,
  FileValidationResult
} from '@backend/services/manufacturers/validation/fileValidation.service';

// Re-export all backend types
export type {
  IManufacturer,
  ManufacturerProfile,
  ManufacturerSearchResult,
  ManufacturerProfileSearchOptions,
  ManufacturerProfileSearchResult,
  ProfileContext,
  ManufacturerSearchParams,
  RegisterManufacturerData,
  UpdateManufacturerData,
  AccountActivity,
  NotificationPreferences,
  DataExportResult,
  ProfilePictureUploadResult,
  SoftDeleteResult,
  ActivityFilters,
  AdvancedSearchFilters,
  ManufacturerAdvancedSearchOptions,
  SearchHighlight,
  AdvancedSearchResult,
  SearchSuggestion,
  ManufacturerSearchComparisonCriteria,
  ManufacturerComparison,
  TrendAnalysis,
  IndustryBenchmark,
  ManufacturerComparisonResult,
  ManufacturerComparisonCriteria,
  VerificationStatus,
  VerificationRequirement,
  VerificationDocument,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  DetailedVerificationStatus,
  FileUploadOptions,
  UploadedFile,
  QRCodeOptions,
  QRCodeResult,
  MediaGallery,
  BrandAssets,
  MediaAnalytics,
  ImageProcessingOptions,
  SupplyChainContractInfo,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainEvent,
  SupplyChainDashboard,
  ProductQrCodeInfo,
  QrCodeGenerationResult,
  BatchQrCodeResult,
  ManufacturerAnalytics,
  ManufacturerStatistics,
  PerformanceMetrics,
  ManufacturerAnalyticsExportOptions,
  ManufacturerAnalyticsExportResult,
  PlanValidationResult,
  ManufacturerPlanLimits,
  ManufacturerPlanFeatures,
  ManufacturerValidationResult,
  FileValidationOptions,
  FileValidationResult
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

