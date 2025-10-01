// src/services/brands/features/index.ts

export { VerificationService } from './verification.service';
export { AnalyticsService } from './analytics.service';
export { WalletService } from './wallet.service';
export { IntegrationsService } from './integrations.service';
export { DiscoveryService } from './discovery.service';

export type {
  VerificationStatus,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  DetailedVerificationStatus
} from './verification.service';

export type {
  AccountAnalytics,
  ProfilePerformance,
  AccountSummary,
  ExportOptions
} from './analytics.service';

export type {
  WalletValidationResult,
  WalletVerificationStatus,
  TokenDiscountInfo,
  WalletOwnershipResult
} from './wallet.service';

export type {
  IntegrationStatus,
  ShopifyIntegrationData,
  ConnectionTestResult
} from './integrations.service';

export type {
  BrandRecommendation,
  ConnectionOpportunity,
  SearchSuggestion,
  EcosystemAnalytics
} from './discovery.service';