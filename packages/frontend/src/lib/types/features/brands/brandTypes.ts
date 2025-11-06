/**
 * Brand Types
 *
 * Re-exports backend brand types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
import type {
  AccountAnalytics,
  AccountSummary,
  BrandAnalytics,
  BrandProfile,
  BrandProfileSummary,
  BrandRecommendation,
  CompletenessConfig,
  CompletenessResult,
  ConnectionOpportunity,
  ConnectionTestResult,
  CustomerFilters,
  CustomerImportData,
  CustomerSummary,
  DetailedVerificationStatus,
  EcosystemAnalytics,
  EmailGatingSettings,
  EnhancedBrandSettings,
  ExportOptions,
  IntegrationStatus,
  ProfilePerformance,
  ProfilePictureUploadResult,
  Recommendation,
  RecommendationContext,
  RecommendationSet,
  SearchSuggestion,
  ShopifyIntegrationData,
  TokenDiscountInfo,
  VerificationStatus,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  WalletOwnershipResult,
  WalletValidationResult,
  WalletVerificationStatus
} from '@backend/services/brands';
import type {
  DeactivationData,
  DeactivationResult,
  ProfileMetadata
} from '@backend/services/brands/core/brandAccount.service';
import type { UpdateBrandSettingsInput } from '@backend/services/brands/core/brandSettings.service';

// Re-export backend types for convenient consumption
export type {
  AccountAnalytics,
  AccountSummary,
  BrandAnalytics,
  BrandProfile,
  BrandProfileSummary,
  BrandRecommendation,
  CompletenessConfig,
  CompletenessResult,
  ConnectionOpportunity,
  ConnectionTestResult,
  CustomerFilters,
  CustomerImportData,
  CustomerSummary,
  DetailedVerificationStatus,
  EcosystemAnalytics,
  EmailGatingSettings,
  EnhancedBrandSettings,
  ExportOptions,
  IntegrationStatus,
  ProfilePerformance,
  ProfilePictureUploadResult,
  Recommendation,
  RecommendationContext,
  RecommendationSet,
  SearchSuggestion,
  ShopifyIntegrationData,
  TokenDiscountInfo,
  UpdateBrandSettingsInput,
  VerificationStatus,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  WalletOwnershipResult,
  WalletValidationResult,
  WalletVerificationStatus
} from '@backend/services/brands';

// ===== FRONTEND-SPECIFIC EXTENSIONS =====

/**
 * Brand profile display type with enhanced UI fields.
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
 * Comprehensive brand account overview returned by brand account APIs.
 */
export interface BrandAccountOverview {
  business: BrandProfile & Record<string, unknown>;
  brandSettings: EnhancedBrandSettings | null;
  profileCompleteness: number;
  lastActivity?: string | Date | null;
  accountAge: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  metadata?: ProfileMetadata;
}

/**
 * Alias for backend deactivation request payload.
 */
export type BrandAccountDeactivationRequest = DeactivationData;

/**
 * Alias for backend deactivation response payload.
 */
export type BrandAccountDeactivationResult = DeactivationResult;

/**
 * Reactivation result payload returned by the backend.
 */
export interface BrandAccountReactivationResult {
  reactivatedAt: string | Date;
  previousDeactivationDate: string | Date | null;
}

/**
 * Brand settings form data used in UI flows.
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

/**
 * Analytics snapshot returned by the customer access analytics endpoint.
 */
export interface BrandCustomerAnalytics {
  overview: {
    total: number;
    active: number;
    registered: number;
    totalVotes: number;
    vipCustomers: number;
  };
  engagement: Record<string, unknown>;
  sources: Record<string, { total: number; active: number }>;
  trends: Array<{
    year: number;
    month: number;
    newCustomers: number;
    activeCustomers: number;
  }>;
}

/**
 * Result returned when checking customer email access.
 */
export interface BrandCustomerEmailAccessCheck {
  allowed: boolean;
  reason?: string;
  customer?: CustomerSummary;
  settings?: EmailGatingSettings;
}

/**
 * Result returned by customer import operations.
 */
export interface BrandCustomerImportResult {
  imported: number;
  updated: number;
  errors: string[];
  batchId: string;
}

/**
 * Result returned when granting voting access to a customer.
 */
export interface BrandCustomerGrantResult {
  granted: boolean;
  customer?: CustomerSummary;
  message: string;
}

/**
 * Result returned when syncing customers from Shopify.
 */
export interface BrandCustomerSyncResult {
  synced: number;
  errors: string[];
}

/**
 * Result returned when bulk updating customer access.
 */
export interface BrandCustomerBulkUpdateResult {
  updated: number;
  errors: string[];
}

/**
 * Result returned when deleting a customer.
 */
export interface BrandCustomerDeleteResult {
  deleted: boolean;
}

/**
 * Profile completeness payload returned by brand account endpoints.
 */
export interface BrandProfileCompleteness {
  score: number;
  recommendations: string[];
}

/**
 * Verification submission response structure for brand account flows.
 */
export interface BrandVerificationSubmissionResult {
  id: string;
  businessId: string;
  status: string;
  submittedAt: string | Date;
  documents: string[];
}

/**
 * Compatibility result for two brands.
 */
export interface BrandCompatibilityResult {
  score: number;
  factors: Array<Record<string, unknown>>;
  recommendations: string[];
}

/**
 * Aggregated integration statistics across all brands.
 */
export interface BrandIntegrationStatistics {
  totalIntegrations: number;
  shopifyIntegrations: number;
  woocommerceIntegrations: number;
  wixIntegrations: number;
}

/**
 * Generic configured integration summary.
 */
export interface BrandConfiguredIntegration {
  id?: string;
  status?: string;
  configuredAt?: string | Date;
  [key: string]: unknown;
}

/**
 * Result returned when removing an integration.
 */
export interface BrandIntegrationRemovalResult {
  dataRemoved: boolean;
  webhooksDisabled: boolean;
  syncStopped: boolean;
}

/**
 * Generic result shells for brand settings operations.
 */
export type BrandSettingsTestResult = Record<string, unknown>;
export type BrandSettingsExportData = Record<string, unknown>;
export type BrandSettingsSyncResult = Record<string, unknown>;
export type BrandSettingsHealth = Record<string, unknown>;
export type BrandDomainInstruction = Record<string, unknown>;
export type BrandDomainValidationResult = Record<string, unknown>;

/**
 * Verification specific types.
 */
export type BrandVerificationHistoryEntry = Record<string, unknown>;
export interface BrandVerificationEmailResult {
  verified: boolean;
  message: string;
}
export interface BrandVerificationSendEmailResult {
  sent: boolean;
  message: string;
  expiresAt?: string | Date;
}
export interface BrandVerificationStatistics {
  totalVerifications: number;
  emailVerifications: number;
  businessVerifications: number;
  walletVerifications: number;
  pendingVerifications: number;
}

/**
 * Wallet statistics aggregated across brands.
 */
export interface BrandWalletStatistics {
  totalConnectedWallets: number;
  verifiedWallets: number;
  walletsWithDiscounts: number;
  averageDiscountCount: number;
}

/**
 * Certificate wallet update response.
 */
export interface BrandCertificateWalletUpdate {
  certificateWallet: string;
  verifiedAt?: string | Date;
}
