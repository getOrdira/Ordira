// src/services/manufacturers/features/index.ts

import { verificationService as verificationServiceInstance } from './verification.service';
import { supplyChainService as supplyChainServiceInstance } from './supplyChain.service';
import { analyticsService as analyticsServiceInstance } from './analytics.service';
import { manufacturerSearchService as manufacturerSearchServiceInstance } from './search.service';
import { manufacturerMediaService as manufacturerMediaServiceInstance } from './media.service';

// Verification features
export {
  VerificationService,
  verificationService
} from './verification.service';

export type {
  VerificationStatus,
  VerificationRequirement,
  VerificationDocument,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  DetailedVerificationStatus
} from './verification.service';

// Supply Chain features
export {
  SupplyChainService,
  supplyChainService
} from './supplyChain.service';

export type {
  SupplyChainContractInfo,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainEvent,
  SupplyChainDashboard,
  ProductQrCodeInfo,
  QrCodeGenerationResult,
  BatchQrCodeResult
} from './supplyChain.service';

// Analytics features
export {
  AnalyticsService,
  analyticsService
} from './analytics.service';

export type {
  ManufacturerAnalytics,
  ManufacturerStatistics,
  PerformanceMetrics,
  ExportOptions,
  ExportResult
} from './analytics.service';

// Search features
export {
  ManufacturerSearchService,
  manufacturerSearchService
} from './search.service';

export type {
  AdvancedSearchFilters,
  SearchOptions,
  SearchHighlight,
  AdvancedSearchResult,
  SearchSuggestion,
  ComparisonCriteria,
  ManufacturerComparison,
  TrendAnalysis,
  IndustryBenchmark
} from './search.service';

// Media features
export {
  ManufacturerMediaService,
  manufacturerMediaService
} from './media.service';

export type {
  FileUploadOptions,
  UploadedFile,
  QRCodeOptions,
  QRCodeResult,
  MediaGallery,
  BrandAssets,
  MediaAnalytics,
  ImageProcessingOptions
} from './media.service';


export const ManufacturerFeatures = {
  verification: verificationServiceInstance,
  supplyChain: supplyChainServiceInstance,
  analytics: analyticsServiceInstance,
  search: manufacturerSearchServiceInstance,
  media: manufacturerMediaServiceInstance
};

// Feature availability check
export const getAvailableFeatures = () => {
  return {
    verification: true,
    supplyChain: true,
    analytics: true,
    search: true,
    media: true
  };
};

// Feature initialization
export const initializeManufacturerFeatures = async () => {
  try {
    // Initialize any required feature setup here
    console.log('Manufacturer feature services initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize manufacturer features:', error);
    return false;
  }
};