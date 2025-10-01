/**
 * Manufacturers Service Module
 *
 * Central export point for all manufacturer-related services, organized into:
 * - Core: Essential manufacturer data, account, and profile services
 * - Features: Advanced functionality (verification, supply chain, analytics, search, media)
 * - Utils: Helper functions and calculation services
 * - Validation: Data validation and business rule enforcement
 */

// Import service instances for unified interface
import { 
  manufacturerDataCoreService,
  manufacturerAccountCoreService,
  manufacturerProfileCoreService
} from './core';

import {
  verificationService,
  supplyChainService,
  analyticsService,
  manufacturerSearchService,
  manufacturerMediaService,
  initializeManufacturerFeatures,
  getAvailableFeatures
} from './features';

import {
  scoreCalculatorService,
  manufacturerHelpersService,
  comparisonEngineService
} from './utils';

import {
  fileValidationService,
  manufacturerValidationService,
  planValidationService
} from './validation';

// ============================================================================
// CORE SERVICES
// ============================================================================

export {
  // Data service
  ManufacturerDataService,
  manufacturerDataCoreService,

  // Account service
  ManufacturerAccountService,
  manufacturerAccountCoreService,

  // Profile service
  ManufacturerProfileService,
  manufacturerProfileCoreService
} from './core';

// Core types
export type {
  ManufacturerSearchParams,
  RegisterManufacturerData,
  UpdateManufacturerData,
  AccountActivity,
  NotificationPreferences,
  DataExportResult,
  ProfilePictureUploadResult,
  SoftDeleteResult,
  ActivityFilters,
  ManufacturerProfile,
  ManufacturerSearchResult,
  SearchOptions,
  SearchResult,
  ProfileContext
} from './core';

// ============================================================================
// FEATURE SERVICES
// ============================================================================

export {
  // Verification
  VerificationService,
  verificationService,

  // Supply Chain
  SupplyChainService,
  supplyChainService,

  // Analytics
  AnalyticsService,
  analyticsService,

  // Search
  ManufacturerSearchService,
  manufacturerSearchService,

  // Media
  ManufacturerMediaService,
  manufacturerMediaService,

  // Feature exports
  ManufacturerFeatures,
  getAvailableFeatures,
  initializeManufacturerFeatures
} from './features';

// Feature types
export type {
  // Verification types
  VerificationStatus,
  VerificationRequirement,
  VerificationDocument,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  DetailedVerificationStatus,

  // Supply Chain types
  SupplyChainContractInfo,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainEvent,
  SupplyChainDashboard,
  ProductQrCodeInfo,
  QrCodeGenerationResult,
  BatchQrCodeResult,

  // Analytics types
  ManufacturerAnalytics,
  ManufacturerStatistics,
  PerformanceMetrics,
  ExportOptions,
  ExportResult,

  // Search types
  AdvancedSearchFilters,
  SearchHighlight,
  AdvancedSearchResult,
  SearchSuggestion,
  ComparisonCriteria,
  ManufacturerComparison,
  TrendAnalysis,
  IndustryBenchmark,

  // Media types
  FileUploadOptions,
  UploadedFile,
  QRCodeOptions,
  QRCodeResult,
  MediaGallery,
  BrandAssets,
  MediaAnalytics,
  ImageProcessingOptions
} from './features';

// ============================================================================
// UTILITY SERVICES
// ============================================================================

export {
  // Score calculator
  ScoreCalculatorService,
  scoreCalculatorService,

  // Manufacturer helpers
  ManufacturerHelpersService,
  manufacturerHelpersService,

  // Comparison engine
  ComparisonEngineService,
  comparisonEngineService
} from './utils';

// Utility types
export type {
  ManufacturerComparisonResult,
  ComparisonCriteria as UtilsComparisonCriteria
} from './utils';

// ============================================================================
// VALIDATION SERVICES
// ============================================================================

export {
  // File validation
  FileValidationService,
  fileValidationService,

  // Manufacturer validation
  ManufacturerValidationService,
  manufacturerValidationService,

  // Plan validation
  PlanValidationService,
  planValidationService
} from './validation';

// Validation types
export type {
  // File validation types
  FileValidationOptions,
  FileValidationResult,

  // Manufacturer validation types
  ValidationResult,

  // Plan validation types
  PlanValidationResult,
  ManufacturerPlanLimits,
  ManufacturerPlanFeatures
} from './validation';

// ============================================================================
// UNIFIED SERVICE INTERFACE
// ============================================================================

/**
 * Unified manufacturer service interface providing access to all services
 */
export const ManufacturerServices = {
  // Core services
  core: {
    data: manufacturerDataCoreService,
    account: manufacturerAccountCoreService,
    profile: manufacturerProfileCoreService
  },

  // Feature services
  features: {
    verification: verificationService,
    supplyChain: supplyChainService,
    analytics: analyticsService,
    search: manufacturerSearchService,
    media: manufacturerMediaService
  },

  // Utility services
  utils: {
    scoreCalculator: scoreCalculatorService,
    helpers: manufacturerHelpersService,
    comparisonEngine: comparisonEngineService
  },

  // Validation services
  validation: {
    file: fileValidationService,
    manufacturer: manufacturerValidationService,
    plan: planValidationService
  }
} as const;

/**
 * Initialize all manufacturer services
 */
export const initializeManufacturerServices = async () => {
  try {
    // Initialize feature services
    await initializeManufacturerFeatures();

    console.log('All manufacturer services initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize manufacturer services:', error);
    return false;
  }
};

/**
 * Get service health status
 */
export const getManufacturerServiceHealth = () => {
  return {
    core: {
      data: true,
      account: true,
      profile: true
    },
    features: getAvailableFeatures(),
    utils: {
      scoreCalculator: true,
      helpers: true,
      comparisonEngine: true
    },
    validation: {
      file: true,
      manufacturer: true,
      plan: true
    }
  };
};
