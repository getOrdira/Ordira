// src/services/brands/index.ts


import { brandProfileCoreService } from './core/brandProfile.service';
import { brandSettingsCoreService } from './core/brandSettings.service';
import { brandAccountCoreService } from './core/brandAccount.service';
import { brandHelpersService } from './utils/brandHelpers.service';
import { completenessCalculatorService } from './utils/completenessCalculator.service';
import { recommendationEngineService } from './utils/recommendationEngine.service';

export {
  // Brand Profile Core Service
  brandProfileCoreService,
  BrandProfileCoreService
} from './core/brandProfile.service';



export {
  // Brand Account Service
  BrandAccountService,
  brandAccountCoreService
} from './core/brandAccount.service';

export {
  // Brand Settings Core Service
  brandSettingsCoreService,
  BrandSettingsCoreService
} from './core/brandSettings.service';

// ===== FEATURE SERVICES =====
// Advanced brand features and capabilities

export {
  // Verification Management
  VerificationService
} from './features/verification.service';

export {
  // Analytics and Performance
  AnalyticsService
} from './features/analytics.service';

export {
  // Web3 Wallet Integration
  WalletService
} from './features/wallet.service';

export {
  // Third-party Integrations
  IntegrationsService
} from './features/integrations.service';

export {
  // Brand Discovery and Networking
  DiscoveryService
} from './features/discovery.service';

// ===== VALIDATION SERVICES =====
// Data validation and business rule enforcement

export {
  // Plan and Feature Validation
  PlanValidationService
} from './validation/planValidation.service';

export {
  // Domain and DNS Validation
  DomainValidationService
} from './validation/domainValidation.service';

export {
  // Brand Data Validation
  BrandValidationService
} from './validation/brandValidation.service';

// ===== UTILITY SERVICES =====
// Helper utilities and calculation engines

export {
  // Brand Helper Utilities
  BrandHelpersService,
  brandHelpersService
} from './utils/brandHelpers.service';

export {
  // Profile Completeness Calculator
  CompletenessCalculatorService,
  completenessCalculatorService
} from './utils/completenessCalculator.service';

export {
  // Recommendation Engine
  RecommendationEngineService,
  recommendationEngineService
} from './utils/recommendationEngine.service';

// ===== TYPE EXPORTS =====
// Export all TypeScript interfaces and types

// Core Types
export type {
  BrandProfile,
  BrandProfileSummary
} from './core/brandProfile.service';

export type {
  ProfilePictureUploadResult
} from './core/brandAccount.service';

export type {
  EnhancedBrandSettings,
  IntegrationStatus as CoreIntegrationStatus,
  DnsRecord as CoreDnsRecord,
  DomainStatus,
  DomainVerification,
  WalletValidationResult as CoreWalletValidationResult,
  ShopifyIntegrationData as CoreShopifyIntegrationData,
  UpdateBrandSettingsInput,
  ConnectionTestResult as CoreConnectionTestResult
} from './core/brandSettings.service';

// Feature Types
export type {
  VerificationStatus,
  VerificationSubmissionData,
  VerificationSubmissionResult,
  DetailedVerificationStatus
} from './features/verification.service';

export type {
  AccountAnalytics,
  ProfilePerformance,
  AccountSummary,
  ExportOptions
} from './features/analytics.service';

export type {
  WalletValidationResult,
  WalletVerificationStatus,
  TokenDiscountInfo,
  WalletOwnershipResult
} from './features/wallet.service';

export type {
  IntegrationStatus,
  ShopifyIntegrationData,
  ConnectionTestResult
} from './features/integrations.service';

export type {
  BrandRecommendation,
  ConnectionOpportunity,
  SearchSuggestion,
  EcosystemAnalytics
} from './features/discovery.service';

// Validation Types
export type {
  PlanFeatures,
  PlanValidationResult,
  PlanLimitations
} from './validation/planValidation.service';

export type {
  DomainValidationResult,
  SubdomainValidationResult,
  DnsRecord,
  DomainVerificationResult,
  CustomDomainSetup
} from './validation/domainValidation.service';

export type {
  FileValidationResult,
  WalletValidationResult as ValidationWalletResult,
  BrandDataValidationResult,
  MediaUploadValidationResult
} from './validation/brandValidation.service';

// Utility Types
export type {
  CompletenessConfig,
  CompletenessResult
} from './utils/completenessCalculator.service';

export type {
  RecommendationContext,
  Recommendation,
  RecommendationSet
} from './utils/recommendationEngine.service';

// ===== CONVENIENCE EXPORTS =====
// Pre-configured service instances for immediate use

export const BrandServices = {
  // Core Services
  profile: brandProfileCoreService,
  settings: brandSettingsCoreService,
  account: brandAccountCoreService,

  // Utility Services
  helpers: brandHelpersService,
  completeness: completenessCalculatorService,
  recommendations: recommendationEngineService
} as const;

// ===== MODULE METADATA =====
export const BrandModuleInfo = {
  version: '2.0.0',
  description: 'Comprehensive brand management system',
  services: {
    core: ['BrandProfileCoreService', 'BrandAccountService', 'BrandSettingsCoreService'],
    features: ['VerificationService', 'AnalyticsService', 'WalletService', 'IntegrationsService', 'DiscoveryService'],
    validation: ['PlanValidationService', 'DomainValidationService', 'BrandValidationService'],
    utils: ['BrandHelpersService', 'CompletenessCalculatorService', 'RecommendationEngineService']
  },
  capabilities: [
    'Profile Management',
    'Brand Settings Configuration',
    'Web3 Integration',
    'Third-party Integrations',
    'Verification Management',
    'Analytics and Performance',
    'Recommendation Engine',
    'Completeness Calculation',
    'Domain Management',
    'Plan Validation'
  ]
} as const;