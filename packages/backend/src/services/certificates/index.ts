/**
 * Certificates Module - Root Export
 *
 * Comprehensive export point for the entire certificates module.
 * This provides a unified interface to all certificate-related services,
 * organized by functional area: core, features, utils, and validation.
 *
 * @module services/certificates
 */

import { CertificateDataService } from './core/certificateData.service';
import { CertificateAccountService } from './core/certificateAccount.service';
import { MintingService } from './features/minting.service';
import { TransferService } from './features/transfer.service';
import { BatchService } from './features/batch.service';
import { DeliveryService } from './features/delivery.service';
import { CertificateAnalyticsService } from './features/analytics.service';
import { CertificateHelpersService } from './utils/certificateHelpers.service';
import { MetadataGeneratorService } from './utils/metadataGenerator.service';
import { ImageGeneratorService } from './utils/imageGenerator.service';
import { CertificateValidationService } from './validation/certificateValidation.service';
import { PlanValidationService } from './validation/planValidation.service';
import { RecipientValidationService } from './validation/recipientValidation.service';

// ============================================================================
// CORE SERVICES - Data and Account Management
// ============================================================================

export {
  // Certificate Data Service - CRUD operations
  CertificateDataService,
  certificateDataService,
  type CertificateListOptions,
  type CertificateListResult,

  // Certificate Account Service - Business account operations
  CertificateAccountService,
  certificateAccountService,
  type CertificateStats,
  type CertificateUsage,
  type TransferUsage,
  type OwnershipStatus,
  type TransferHealth
} from './core';

// ============================================================================
// FEATURE SERVICES - Business Logic & Operations
// ============================================================================

export {
  // Minting Service - Certificate creation and minting
  MintingService,
  mintingService,
  type CreateCertInput,

  // Transfer Service - Certificate transfer operations
  TransferService,
  transferService,
  type TransferResult,
  type TransferRetryResult,

  // Batch Service - Batch certificate operations
  BatchService,
  batchService,
  type BatchCreateInput,
  type BatchJobResult,
  type BatchProgress,

  // Delivery Service - Certificate delivery management
  DeliveryService,
  deliveryService,
  type DeliveryData,
  type DeliveryResult,
  type ScheduleDeliveryResult,

  // Analytics Service - Certificate analytics and insights
  CertificateAnalyticsService,
  certificateAnalyticsService,
  type Web3Insights,
  type MonthlyStats
} from './features';

// ============================================================================
// UTILITY SERVICES - Helper Functions
// ============================================================================

export {
  // Certificate Helpers - General utility functions
  CertificateHelpersService,
  certificateHelpersService,
  validateRecipient as utilValidateRecipient,
  validateProductOwnership as utilValidateProductOwnership,
  getOwnershipStatus,
  getTransferHealth,
  getCertificateNextSteps,
  getTransferUsage,
  getTransferLimits,
  getPlanLimits,
  calculateEstimatedGasCost,
  calculateMonthlyGrowth,
  generateWeb3Insights,
  generateWeb3Recommendations,

  // Metadata Generator - NFT metadata creation
  MetadataGeneratorService,
  metadataGeneratorService,
  generateNFTMetadata,
  storeNFTMetadataInS3,
  getMetadataUri,
  updateMetadataImage,
  addMetadataAttributes,
  type MetadataOptions,
  type NFTMetadata,

  // Image Generator - Certificate image generation
  ImageGeneratorService,
  imageGeneratorService,
  generateCertificateSVG,
  generateDefaultCertificateImage,
  generateCustomCertificate,
  getCertificateLevelColor,
  isValidCertificateLevel,
  getAvailableTemplates,
  generateCertificatePreviewUrl,
  type ImageGenerationOptions,
  type CertificateImageResult,

  // Utils convenience object
  certificateUtils
} from './utils';

// ============================================================================
// VALIDATION SERVICES - Input and Business Rule Validation
// ============================================================================

export {
  // Certificate Validation - Core certificate validation
  CertificateValidationService,
  certificateValidationService,
  checkDuplicateCertificate,
  validateCertificateOwnership,
  validateProductOwnership,
  validateTransferParameters,
  validateWalletAddress,
  validateRelayerWallet,
  validateCertificateTransferable,
  validateCertificateMetadata,
  validateBatchInputs,

  // Plan Validation - Plan limits and quotas
  PlanValidationService,
  planValidationService,
  getPlanLimits as validationGetPlanLimits,
  getTransferLimits as validationGetTransferLimits,
  getBatchLimits,
  planHasWeb3Features,
  planAllowsOverage,
  validateCertificateQuota,
  validateTransferQuota,
  validateBatchSize,
  validateWeb3Access,
  validateAutoTransferAccess,
  getUpgradeRecommendation,
  validateFeatureAccess,
  type PlanLimits,
  type TransferLimits,
  type BatchLimits,

  // Recipient Validation - Recipient address validation
  RecipientValidationService,
  recipientValidationService,
  validateEmail,
  validatePhoneNumber,
  validateWalletAddress as validateRecipientWallet,
  validateRecipient,
  validateContactMethod,
  validateBatchRecipients,
  checkDuplicateRecipients,
  sanitizeRecipient,
  validateRecipientNotBlacklisted,
  validateEmailDomain,
  detectContactMethod,
  type ContactMethod,
  type RecipientValidationResult,
  type BatchRecipientValidationResult,

  // Validation convenience object
  certificateValidation
} from './validation';

// ============================================================================
// CONVENIENCE EXPORTS - Organized Service Collections
// ============================================================================

/**
 * Organized collection of all certificate services
 * Use this for easy access to all services in one place
 *
 * @example
 * import { certificatesServices } from '@/services/certificates';
 *
 * const { core, features, utils, validation } = certificatesServices;
 * await core.data.getCertificate(id, businessId);
 * await features.minting.mintCertificate(input);
 * await validation.plan.validateCertificateQuota(businessId, plan);
 */
export const certificatesServices = {
  core: {
    data: CertificateDataService,
    account: CertificateAccountService
  },
  features: {
    minting: MintingService,
    transfer: TransferService,
    batch: BatchService,
    delivery: DeliveryService,
    analytics: CertificateAnalyticsService
  },
  utils: {
    helpers: CertificateHelpersService,
    metadata: MetadataGeneratorService,
    images: ImageGeneratorService
  },
  validation: {
    certificate: CertificateValidationService,
    plan: PlanValidationService,
    recipient: RecipientValidationService
  }
};

/**
 * Get all certificate services
 * Alias for certificatesServices
 */
export const getCertificatesServices = () => certificatesServices;
